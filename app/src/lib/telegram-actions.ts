import 'server-only'

import {
  deleteProduct,
  duplicateProduct,
  ProductValidationError,
  updateProduct,
  type ProductPatch,
} from './admin-products'
import {
  createPromotion,
  deletePromotion,
  PromotionValidationError,
  setPromotionActive,
  updatePromotion,
  type PromotionInput,
} from './admin-promotions'
import { getSiteSettingsInput, saveSiteSettings } from './admin-settings'
import { demoteUser, setUserRole } from './admin-users'
import {
  isOrderStatus,
  isPaymentStatus,
  OrderValidationError,
  updateOrder,
  type OrderUpdate,
} from './admin-orders'
import { insforgeAdmin } from './insforge-admin'
import { notifyOrderStatusChange } from './notify-channels'
import { revalidateCatalog } from './revalidate-catalog'
import { escapeHtml, sendMessage, type ReplyMarkup } from './telegram-api'

/**
 * Registre des actions du bot + porteuse de confirmation.
 *
 * Regle de conception : le bot ne construit jamais de SQL ni de requete a
 * partir du texte de l'admin. Chaque commande se traduit en une action nommee
 * et un payload valide, executes par les **memes fonctions** que le
 * back-office (`updateOrder`, `updateProduct`, `setUserRole`, ...). C'est ce
 * qui garantit que le bot ne peut pas ecrire un etat que le dashboard refuse.
 *
 * Toute action passe par une confirmation explicite, persistee en base
 * (`telegram_actions`) : le `callback_data` d'un bouton Telegram est limite a
 * 64 octets, on n'y met donc que l'id de la proposition. Les actions
 * destructrices demandent une seconde confirmation.
 */

/** Delai au-dela duquel une proposition non confirmee expire. */
const PROPOSAL_TTL_MS = 30 * 60 * 1000

type Payload = Record<string, unknown>

export type Danger = 'normal' | 'destructive'

export interface ProposedAction {
  /** Cle du registre (`order.update`, `product.patch`, ...). */
  action: string
  payload: Payload
  /** Message de confirmation, **deja echappe**, affiche tel quel. */
  summary: string
  danger?: Danger
  /** Ligne d'aide specifique affichee sous le resume. */
  hint?: string
}

interface StoredAction {
  id: string
  chat_id: number
  command: string
  action: string
  payload: Payload
  summary: string
  danger: Danger
  status: 'PENDING' | 'APPLIED' | 'CANCELLED' | 'FAILED' | 'EXPIRED'
  error: string | null
  created_at: string
  resolved_at: string | null
}

export interface ProposalOutcome {
  text: string
  keyboard?: ReplyMarkup
}

/* ------------------------------------------------------------------ */
/* Validation du payload                                               */
/* ------------------------------------------------------------------ */

function requireString(payload: Payload, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Champ « ${key} » manquant dans la proposition.`)
  }

  return value
}

function optionalString(payload: Payload, key: string): string | undefined {
  const value = payload[key]

  return typeof value === 'string' ? value : undefined
}

function requireObject(payload: Payload, key: string): Payload {
  const value = payload[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Champ « ${key} » invalide dans la proposition.`)
  }

  return value as Payload
}

function requireTextValue(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Valeur texte attendue.')

  return value
}

function requireBoolValue(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Valeur oui/non attendue.')

  return value
}

function requireMoneyValue(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('Montant invalide.')
  }

  return value
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

type Runner = (payload: Payload) => Promise<string>

const RUNNERS: Record<string, Runner> = {
  /** Statut, paiement, note et fenetre de livraison d'une commande. */
  'order.update': async (payload) => {
    const orderId = requireString(payload, 'orderId')
    const ref = requireString(payload, 'ref')
    const patch: OrderUpdate = {}

    const status = optionalString(payload, 'status')
    if (status !== undefined) {
      if (!isOrderStatus(status)) throw new Error(`Statut de commande inconnu : ${status}.`)
      patch.status = status
    }

    const paymentStatus = optionalString(payload, 'paymentStatus')
    if (paymentStatus !== undefined) {
      if (!isPaymentStatus(paymentStatus)) {
        throw new Error(`Statut de paiement inconnu : ${paymentStatus}.`)
      }
      patch.paymentStatus = paymentStatus
    }

    if ('notes' in payload) patch.notes = optionalString(payload, 'notes') ?? null
    if ('deliveryWindowStart' in payload) {
      patch.deliveryWindowStart = optionalString(payload, 'deliveryWindowStart') ?? null
    }
    if ('deliveryWindowEnd' in payload) {
      patch.deliveryWindowEnd = optionalString(payload, 'deliveryWindowEnd') ?? null
    }

    if (Object.keys(patch).length === 0) throw new Error('Aucun changement a appliquer.')

    await updateOrder(orderId, patch)

    // Meme canal que le dashboard : le client recoit la notification in-app.
    if (patch.status) {
      void notifyOrderStatusChange({ orderId, status: patch.status }).catch(() => {})
    }
    revalidateCatalog()

    return `Commande <b>#${escapeHtml(ref)}</b> mise a jour.`
  },

  /** Edition partielle d'un produit (stock, prix, bascules). */
  'product.patch': async (payload) => {
    const id = requireString(payload, 'id')
    const name = requireString(payload, 'name')
    const patch = requireObject(payload, 'patch') as ProductPatch

    await updateProduct(id, patch)
    revalidateCatalog()

    return `Produit « ${escapeHtml(name)} » mis a jour.`
  },

  'product.duplicate': async (payload) => {
    const id = requireString(payload, 'id')
    const colorway = optionalString(payload, 'colorway')
    const created = await duplicateProduct(id, colorway ? { colorway } : {})

    revalidateCatalog()

    return `Coloris cree : <b>${escapeHtml(created.slug)}</b> (stock remis a zero, visuels a ajouter).`
  },

  'product.delete': async (payload) => {
    const id = requireString(payload, 'id')
    const name = requireString(payload, 'name')

    await deleteProduct(id)
    revalidateCatalog()

    return `Produit « ${escapeHtml(name)} » supprime.`
  },

  'user.role': async (payload) => {
    const userId = requireString(payload, 'userId')
    const email = requireString(payload, 'email')
    const role = requireString(payload, 'role')

    if (role === 'ADMIN') {
      await setUserRole(userId, 'ADMIN')
    } else {
      const result = await demoteUser(userId)
      if (!result.ok) {
        throw new Error('Impossible : ce compte est le dernier administrateur.')
      }
    }

    revalidateCatalog()

    return `${escapeHtml(email)} est desormais <b>${role}</b>.`
  },

  'promotion.active': async (payload) => {
    const id = requireString(payload, 'id')
    const name = requireString(payload, 'name')
    const active = payload.active === true

    await setPromotionActive(id, active)
    revalidateCatalog()

    return `Promotion « ${escapeHtml(name)} » ${active ? 'activee' : 'desactivee'}.`
  },

  'promotion.delete': async (payload) => {
    const id = requireString(payload, 'id')
    const name = requireString(payload, 'name')

    await deletePromotion(id)
    revalidateCatalog()

    return `Promotion « ${escapeHtml(name)} » supprimee.`
  },

  'promotion.save': async (payload) => {
    const input = requireObject(payload, 'input') as unknown as PromotionInput
    const id = optionalString(payload, 'id')
    const name = requireString(payload, 'name')

    if (id) {
      await updatePromotion(id, input)
    } else {
      await createPromotion(input)
    }

    revalidateCatalog()

    return `Promotion « ${escapeHtml(name)} » ${id ? 'mise a jour' : 'creee'}.`
  },

  'settings.save': async (payload) => {
    const changes = requireObject(payload, 'changes')
    const label = requireString(payload, 'label')

    // Seuls les champs nommes sont touches, et ils sont relus au moment de
    // l'execution : une modification faite entre-temps dans le dashboard, ou
    // par une autre proposition confirmee juste avant, est donc conservee.
    const input = await getSiteSettingsInput()

    for (const [field, value] of Object.entries(changes)) {
      switch (field) {
        case 'heroTitle':
          input.heroTitle = requireTextValue(value)
          break
        case 'heroSubtitle':
          input.heroSubtitle = requireTextValue(value)
          break
        case 'contactEmail':
          input.contactEmail = requireTextValue(value)
          break
        case 'contactPhone':
          input.contactPhone = requireTextValue(value)
          break
        case 'contactAddress':
          input.contactAddress = requireTextValue(value)
          break
        case 'announcementText':
          input.announcementText = requireTextValue(value)
          break
        case 'announcementEnabled':
          input.announcementEnabled = requireBoolValue(value)
          break
        case 'maintenanceMode':
          input.maintenanceMode = requireBoolValue(value)
          break
        case 'newsletterEnabled':
          input.newsletterEnabled = requireBoolValue(value)
          break
        case 'shippingCost':
          input.shippingCost = requireMoneyValue(value)
          break
        case 'freeShippingThreshold':
          input.freeShippingThreshold = requireMoneyValue(value)
          break
        default:
          throw new Error(`Reglage inconnu : ${field}.`)
      }
    }

    await saveSiteSettings(input)
    revalidateCatalog()

    return `Reglage mis a jour : ${escapeHtml(label)}.`
  },

  /** Création d'un produit depuis un brouillon IA confirmé. */
  'product.create': async (payload) => {
    const draftId = requireString(payload, 'draftId')
    const imageUrl = requireString(payload, 'imageUrl')
    const name = requireString(payload, 'name')

    const { confirmProductDraft } = await import('./telegram-products')
    const result = await confirmProductDraft(draftId)

    return `Produit <b>${escapeHtml(name)}</b> créé.\n` +
      `Réf <code>${result.productId.slice(0, 8).toUpperCase()}</code> · slug <code>${escapeHtml(result.slug)}</code>\n\n` +
      `Complétez le prix, les pointures et la catégorie depuis le dashboard.`
  },

  /** Confirmation d'une commande (envoie les coordonnées client). */
  'order.confirm': async (payload) => {
    const orderId = requireString(payload, 'orderId')
    const ref = requireString(payload, 'ref')

    const { confirmOrder } = await import('./telegram-orders')
    const customer = await confirmOrder(orderId)

    return `Commande <b>#${escapeHtml(ref)}</b> confirmée.\n\n` +
      `<b>Coordonnées client :</b>\n` +
      `Nom : ${escapeHtml(customer.customerName)}\n` +
      `Téléphone : ${escapeHtml(customer.customerPhone)}\n` +
      `Email : ${escapeHtml(customer.customerEmail)}\n` +
      `Adresse : ${escapeHtml(customer.customerAddress)}`
  },

  /** Annulation d'une commande. */
  'order.cancel.confirmed': async (payload) => {
    const orderId = requireString(payload, 'orderId')
    const ref = requireString(payload, 'ref')

    const { cancelOrder } = await import('./telegram-orders')
    await cancelOrder(orderId)

    return `Commande <b>#${escapeHtml(ref)}</b> annulée.`
  },
}

/** Traduit les erreurs de validation metier en message lisible par l'admin. */
const PRODUCT_ERRORS: Record<string, string> = {
  notFound: 'Produit introuvable.',
  hasSales: 'Ce produit a deja des ventes : desactivez-le au lieu de le supprimer.',
  sizes: 'Pointures invalides.',
  name: 'Nom invalide.',
  slug: 'Ce slug est deja utilise.',
  sku: 'Ce SKU est deja utilise.',
  price: 'Prix invalide.',
}

const PROMOTION_ERRORS: Record<string, string> = {
  name: 'Nom de promotion invalide.',
  type: 'Type de promotion invalide.',
  percentage: 'Pourcentage invalide (0 à 100).',
  dates: 'Dates invalides (fin avant début ?).',
  targets: 'Aucune cible : indiquez au moins un produit ou une catégorie.',
}

const ORDER_ERRORS: Record<string, string> = {
  status: 'Statut de commande invalide.',
  paymentStatus: 'Statut de paiement invalide.',
}

function humanError(error: unknown): string {
  if (error instanceof ProductValidationError) {
    return PRODUCT_ERRORS[error.field] ?? `Validation produit : ${error.field}.`
  }
  if (error instanceof PromotionValidationError) {
    return PROMOTION_ERRORS[error.field] ?? `Validation promotion : ${error.field}.`
  }
  if (error instanceof OrderValidationError) {
    return ORDER_ERRORS[error.field] ?? `Validation commande : ${error.field}.`
  }
  if (error instanceof Error) return error.message

  return 'Erreur inconnue.'
}

/* ------------------------------------------------------------------ */
/* Persistance + confirmation                                          */
/* ------------------------------------------------------------------ */

async function resolveAction(
  id: string,
  status: StoredAction['status'],
  error?: string,
): Promise<void> {
  const { error: writeError } = await insforgeAdmin()
    .database.from('telegram_actions')
    .update({ status, error: error ?? null, resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (writeError) console.error('telegram_actions resolve:', writeError.message)
}

/** Ecrit la proposition et envoie le message de confirmation avec ses boutons. */
export async function proposeAction(
  chatId: number,
  command: string,
  proposal: ProposedAction,
): Promise<void> {
  const danger: Danger = proposal.danger ?? 'normal'

  const { data, error } = await insforgeAdmin()
    .database.from('telegram_actions')
    .insert([
      {
        chat_id: chatId,
        command,
        action: proposal.action,
        payload: proposal.payload,
        summary: proposal.summary,
        danger,
      },
    ])
    .select('id')
    .single()

  if (error) throw new Error(`telegram_actions: ${error.message}`)

  const id = (data as unknown as { id: string }).id

  const footer =
    danger === 'destructive'
      ? '⚠️ <b>Action irréversible.</b> Une seconde confirmation sera demandée.'
      : 'Confirmer ?'

  const keyboard: ReplyMarkup = {
    inline_keyboard: [
      [
        { text: danger === 'destructive' ? 'Continuer' : 'Confirmer', callback_data: `run:${id}` },
        { text: 'Annuler', callback_data: `drop:${id}` },
      ],
    ],
  }

  const lines = [proposal.summary, '']
  if (proposal.hint) lines.push(proposal.hint, '')
  lines.push(footer)

  await sendMessage(chatId, lines.join('\n'), keyboard)
}

type LoadResult =
  | { ok: true; row: StoredAction }
  | { ok: false; message: string }

async function loadPending(id: string, chatId: number): Promise<LoadResult> {
  const { data, error } = await insforgeAdmin()
    .database.from('telegram_actions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, message: `Lecture impossible : ${escapeHtml(error.message)}` }
  if (!data) return { ok: false, message: 'Proposition introuvable.' }

  const row = data as unknown as StoredAction

  // Un bouton peut etre transfere : on verifie que le clic vient du chat qui a
  // demande l'action, et pas d'une conversation ou le message aurait ete colle.
  if (Number(row.chat_id) !== Number(chatId)) {
    return { ok: false, message: 'Cette proposition appartient à un autre chat.' }
  }

  if (row.status !== 'PENDING') {
    const labels: Record<string, string> = {
      APPLIED: 'déjà appliquée',
      CANCELLED: 'annulée',
      FAILED: 'en échec',
      EXPIRED: 'expirée',
    }

    return { ok: false, message: `Proposition ${labels[row.status] ?? row.status}.` }
  }

  if (Date.now() - Date.parse(row.created_at) > PROPOSAL_TTL_MS) {
    await resolveAction(row.id, 'EXPIRED')

    return { ok: false, message: 'Proposition expirée : relancez la commande.' }
  }

  return { ok: true, row }
}

/**
 * Applique une proposition.
 *
 * `force` vaut `true` au second clic d'une action destructrice : le premier
 * clic ne fait qu'afficher l'avertissement.
 */
export async function runAction(
  id: string,
  chatId: number,
  force: boolean,
): Promise<ProposalOutcome> {
  const loaded = await loadPending(id, chatId)
  if (!loaded.ok) return { text: loaded.message }

  const { row } = loaded

  if (row.danger === 'destructive' && !force) {
    return {
      text: `${row.summary}\n\n⚠️ <b>Confirmer définitivement ?</b> Cette action ne peut pas être annulée.`,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🗑 Oui, exécuter', callback_data: `run2:${row.id}` },
            { text: 'Non, abandonner', callback_data: `drop:${row.id}` },
          ],
        ],
      },
    }
  }

  const runner = RUNNERS[row.action]
  if (!runner) {
    await resolveAction(row.id, 'FAILED', `action inconnue: ${row.action}`)

    return { text: `Action inconnue : <code>${escapeHtml(row.action)}</code>.` }
  }

  try {
    const message = await runner(row.payload ?? {})
    await resolveAction(row.id, 'APPLIED')

    return { text: `✅ ${message}` }
  } catch (error) {
    const message = humanError(error)
    console.error(`telegram action ${row.action}:`, error)
    await resolveAction(row.id, 'FAILED', message)

    return { text: `⚠️ ${escapeHtml(message)}` }
  }
}

export async function cancelAction(id: string, chatId: number): Promise<ProposalOutcome> {
  const loaded = await loadPending(id, chatId)
  if (!loaded.ok) return { text: loaded.message }

  await resolveAction(loaded.row.id, 'CANCELLED')

  return { text: '❌ Annulé.' }
}

export interface ActionLogRow {
  id: string
  command: string
  action: string
  summary: string
  status: StoredAction['status']
  error: string | null
  createdAt: string
}

export async function listRecentActions(limit = 10): Promise<ActionLogRow[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('telegram_actions')
    .select('id,command,action,summary,status,error,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`telegram_actions: ${error.message}`)

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    command: String(row.command ?? ''),
    action: String(row.action ?? ''),
    summary: String(row.summary ?? ''),
    status: (row.status as StoredAction['status']) ?? 'PENDING',
    error: (row.error as string | null) ?? null,
    createdAt: String(row.created_at),
  }))
}

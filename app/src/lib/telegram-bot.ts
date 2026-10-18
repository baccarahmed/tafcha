import 'server-only'

import { getSalesAnalytics, isCountedSale, type SalesPeriod } from './admin-analytics'
import {
  getAdminOrderDetail,
  isOrderStatus,
  ORDER_STATUSES,
  updateOrder,
  type OrderStatus,
} from './admin-orders'
import { insforgeAdmin } from './insforge-admin'
import { notifyOrderStatusChange } from './notify-channels'
import { shortOrderId } from './notifications-types'
import { revalidateCatalog } from './revalidate-catalog'
import {
  answerCallbackQuery,
  editMessageText,
  escapeHtml,
  isAllowedChat,
  sendChatAction,
  sendMessage,
  type ReplyMarkup,
  type TelegramCallbackQuery,
  type TelegramUpdate,
} from './telegram-api'

/**
 * Bot Telegram a deux sens — phases 1 & 2.
 *
 * Phase 1 (lecture seule) : `/orders`, `/order`, `/stats`, `/stock`.
 * Phase 2 (ecriture avec confirmation) : `/setstatus` (et son raccourci
 * `/ship`) proposent des boutons inline ; l'ecriture n'a lieu qu'au clic sur
 * « Confirmer ». Aucune commande ne modifie la base sans confirmation
 * explicite, et les ecritures passent par les memes fonctions que le
 * back-office (`updateOrder` + `revalidateCatalog` + notification), donc les
 * caches et l'historique restent coherents avec le dashboard.
 *
 * Le controle d'acces est une allowlist de chats : un update d'un chat inconnu
 * est poliment refuse et rien n'est lu ni ecrit.
 */

/** Colonnes communes a toutes les lectures de commande. */
const ORDER_FIELDS =
  'id,status,payment_status,payment_method,subtotal,shipping,total,notes,shipping_address,created_at'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface OrderRow {
  id: string
  status: string | null
  payment_status: string | null
  payment_method: string | null
  subtotal: number | string | null
  shipping: number | string | null
  total: number | string | null
  notes: string | null
  shipping_address: unknown
  created_at: string
}

interface ProductStockRow {
  id: string
  name: string | null
  colorway: string | null
  stock: number | null
  sizes: unknown
}

const STATUS_LABELS: Record<string, { emoji: string; label: string }> = {
  PENDING: { emoji: '🟠', label: 'En attente' },
  PROCESSING: { emoji: '🔵', label: 'En préparation' },
  SHIPPED: { emoji: '🚚', label: 'Expédiée' },
  DELIVERED: { emoji: '✅', label: 'Livrée' },
  CANCELLED: { emoji: '❌', label: 'Annulée' },
}

function statusBadge(status: string | null | undefined): string {
  const entry = STATUS_LABELS[status ?? ''] ?? { emoji: '⚪️', label: status ?? '—' }

  return `${entry.emoji} ${entry.label}`
}

function money(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount ?? 0

  return `${Number.isFinite(value) ? (value as number).toFixed(2) : '0.00'} DT`
}

/** Date au format court, a l'heure de Tunis (UTC+1 fixe, sans heure d'ete). */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** Minuit heure de Tunis, exprime en UTC. */
function tunisStartOfDay(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number)

  // Tunisie = UTC+1 toute l'annee : minuit local = 23 h UTC la veille.
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]) - 3600_000)
}

function addressField(address: unknown, key: string): string | null {
  if (address && typeof address === 'object' && key in address) {
    const value = (address as Record<string, unknown>)[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

function customerName(address: unknown): string {
  return addressField(address, 'fullName') ?? addressField(address, 'email') ?? '—'
}

interface OrderLookupRow {
  id: string
  status: string | null
  payment_status: string | null
  payment_method: string | null
  subtotal: number | null
  shipping: number | null
  total: number | null
  notes: string | null
  shipping_address: unknown
  created_at: string
}

/**
 * Retrouve une commande par uuid complet ou par reference courte (8 premiers
 * caracteres). `orders` n'a pas de colonne `reference` : la recherche courte
 * balaie les dernieres commandes cote application plutot que d'ecrire un SQL
 * avec cast d'uuid, qui dependrait du dialecte PostgREST du deploiement.
 */
async function findOrder(ref: string): Promise<OrderLookupRow | null> {
  const db = insforgeAdmin().database
  const trimmed = ref.trim()

  if (UUID_RE.test(trimmed)) {
    const { data, error } = await db
      .from('orders')
      .select(ORDER_FIELDS)
      .eq('id', trimmed.toLowerCase())
      .maybeSingle()

    if (error) throw new Error(`orders: ${error.message}`)

    return (data as OrderLookupRow | null) ?? null
  }

  const clean = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length < 4) return null

  const { data, error } = await db
    .from('orders')
    .select(ORDER_FIELDS)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(`orders: ${error.message}`)

  const rows = (data ?? []) as OrderLookupRow[]

  return rows.find((row) => row.id.slice(0, clean.length).toUpperCase() === clean) ?? null
}

function helpText(): string {
  return [
    '<b>Q2M · Bot boutique</b>',
    '',
    '<b>Lecture</b>',
    '/orders <i>[n]</i> — les n dernieres commandes (defaut 5)',
    '/order <i>#REF</i> — detail d\u2019une commande',
    '/stats <i>[today|week|month]</i> — chiffre d\u2019affaires',
    '/stock <i>[seuil]</i> — produits bientot en rupture (defaut 3)',
    '',
    '<b>Action</b>',
    '/setstatus <i>#REF STATUS</i> — changer le statut (confirmation)',
    '/ship <i>#REF</i> — raccourci vers SHIPPED',
    '',
    `Statuts : <code>${ORDER_STATUSES.join('</code> <code>')}</code>`,
  ].join('\n')
}

async function cmdOrders(chatId: number, args: string[]): Promise<void> {
  const parsed = Number.parseInt(args[0] ?? '', 10)
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 20) : 5

  await sendChatAction(chatId)

  const { data, error } = await insforgeAdmin()
    .database.from('orders')
    .select(ORDER_FIELDS)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`orders: ${error.message}`)

  const rows = (data ?? []) as OrderLookupRow[]

  if (rows.length === 0) {
    await sendMessage(chatId, 'Aucune commande enregistree.')
    return
  }

  const lines = rows.map((row) => {
    return [
      `${statusBadge(row.status)} <b>#${shortOrderId(row.id)}</b> · ${money(row.total)}`,
      `${escapeHtml(customerName(row.shipping_address))} · <code>${formatDate(row.created_at)}</code>`,
    ].join('\n')
  })

  await sendMessage(chatId, `<b>Dernieres ${rows.length} commande(s)</b>\n\n${lines.join('\n\n')}`)
}

async function cmdOrder(chatId: number, args: string[]): Promise<void> {
  const ref = args[0]

  if (!ref) {
    await sendMessage(chatId, 'Usage : <code>/order #A1B2C3D4</code>')
    return
  }

  await sendChatAction(chatId)

  const order = await findOrder(ref)

  if (!order) {
    await sendMessage(chatId, `Commande introuvable : <code>${escapeHtml(ref)}</code>`)
    return
  }

  const detail = await getAdminOrderDetail(order.id)
  const items = detail?.items ?? []
  const address = order.shipping_address

  const itemLines = items.map((item) => {
    const colorway = item.colorway ? ` · ${escapeHtml(item.colorway)}` : ''

    return `• ${item.quantity}× ${escapeHtml(item.name ?? '—')}${colorway} — ${money(item.lineTotal)}`
  })

  const addressLine = [
    addressField(address, 'line1'),
    addressField(address, 'city'),
    addressField(address, 'postalCode'),
    addressField(address, 'country'),
  ]
    .filter(Boolean)
    .join(', ')

  const lines = [
    `<b>Commande #${shortOrderId(order.id)}</b>`,
    `Statut : ${statusBadge(order.status)}`,
    `Paiement : ${escapeHtml(order.payment_status ?? '—')}${
      order.payment_method ? ` (${escapeHtml(order.payment_method)})` : ''
    }`,
    `Creee le ${formatDate(order.created_at)}`,
    '',
    '<b>Articles</b>',
    ...(itemLines.length > 0 ? itemLines : ['• —']),
    '',
    `Sous-total : ${money(order.subtotal)}`,
    `Livraison : ${money(order.shipping)}`,
    `<b>Total : ${money(order.total)}</b>`,
    '',
    '<b>Livraison</b>',
    escapeHtml(addressField(address, 'fullName') ?? '—'),
    escapeHtml(addressField(address, 'phone') ?? '—'),
    escapeHtml(addressLine || '—'),
  ]

  const notes = order.notes ?? addressField(address, 'notes')
  if (notes) lines.push('', '<b>Note</b>', escapeHtml(notes))

  await sendMessage(chatId, lines.join('\n'))
}

/** Resume du jour, calcule sur les commandes comptees comme ventes. */
async function todaySummary(): Promise<{ count: number; revenue: number }> {
  const { data, error } = await insforgeAdmin()
    .database.from('orders')
    .select('status,payment_status,total')
    .gte('created_at', tunisStartOfDay().toISOString())

  if (error) throw new Error(`orders: ${error.message}`)

  const rows = (data ?? []) as Array<{
    status: string | null
    payment_status: string | null
    total: number | string | null
  }>

  let count = 0
  let revenue = 0

  for (const row of rows) {
    if (!isCountedSale(row.status, row.payment_status)) continue
    count += 1
    revenue += typeof row.total === 'string' ? Number.parseFloat(row.total) : row.total ?? 0
  }

  return { count, revenue }
}

async function cmdStats(chatId: number, args: string[]): Promise<void> {
  const scope = (args[0] ?? '').toLowerCase()

  await sendChatAction(chatId)

  if (scope === 'today' || scope === 'jour' || scope === "aujourd'hui") {
    const { count, revenue } = await todaySummary()
    const average = count > 0 ? revenue / count : 0

    await sendMessage(
      chatId,
      [
        '<b>Aujourd\u2019hui</b> (depuis minuit, heure de Tunis)',
        '',
        `Commandes : <b>${count}</b>`,
        `Chiffre d\u2019affaires : <b>${money(revenue)}</b>`,
        `Panier moyen : ${money(average)}`,
      ].join('\n'),
    )
    return
  }

  const period: SalesPeriod = scope === 'month' || scope === 'mois' ? '1m' : '7d'
  const analytics = await getSalesAnalytics(period, 5)
  const { summary, topProducts } = analytics

  const label = period === '1m' ? '30 derniers jours' : '7 derniers jours'

  const lines = [
    `<b>${label}</b>`,
    '',
    `Commandes : <b>${summary.orderCount}</b>`,
    `Articles vendus : <b>${summary.unitsSold}</b>`,
    `Chiffre d\u2019affaires : <b>${money(summary.revenue)}</b>`,
    `Panier moyen : ${money(summary.averageBasket)}`,
  ]

  if (topProducts.length > 0) {
    lines.push('', '<b>Top produits</b>')

    for (const product of topProducts) {
      const colorway = product.colorway ? ` · ${escapeHtml(product.colorway)}` : ''

      lines.push(`${product.rank}. ${escapeHtml(product.name ?? '—')}${colorway} — ${product.unitsSold} u.`)
    }
  }

  await sendMessage(chatId, lines.join('\n'))
}

interface SizeStock {
  size: number
  stock: number
}

function parseSizes(value: unknown): SizeStock[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const size = (entry as { size?: unknown }).size
    const stock = (entry as { stock?: unknown }).stock

    if (typeof size !== 'number' || typeof stock !== 'number') return []

    return [{ size, stock }]
  })
}

async function cmdStock(chatId: number, args: string[]): Promise<void> {
  const parsed = Number.parseInt(args[0] ?? '', 10)
  const threshold = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 20) : 3

  await sendChatAction(chatId)

  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('id,name,colorway,stock,sizes')
    .eq('active', true)
    .lte('stock', threshold)
    .order('stock', { ascending: true })
    .limit(30)

  if (error) throw new Error(`products: ${error.message}`)

  const rows = (data ?? []) as SizeStockRow[]

  if (rows.length === 0) {
    await sendMessage(chatId, `Aucun produit actif a ${threshold} unité(s) ou moins. 👍`)
    return
  }

  const lines = rows.map((row) => {
    const colorway = row.colorway ? ` · ${escapeHtml(row.colorway)}` : ''
    const header = `• ${escapeHtml(row.name ?? '—')}${colorway} — <b>${row.stock ?? 0}</b> en stock`

    const sizes = parseSizes(row.sizes)
    if (sizes.length === 0) return header

    const breakdown = sizes.map((size) => `${size.size}:${size.stock}`).join(' ')
    return `${header}\n  <code>${breakdown}</code>`
  })

  await sendMessage(
    chatId,
    `<b>Stock faible</b> (≤ ${threshold})\n\n${lines.join('\n')}`,
  )
}

interface SizeStockRow {
  id: string
  name: string | null
  colorway: string | null
  stock: number | null
  sizes: unknown
}

async function cmdSetStatus(chatId: number, args: string[]): Promise<void> {
  const [ref, rawStatus] = args

  if (!ref || !rawStatus) {
    await sendMessage(chatId, 'Usage : <code>/setstatus #A1B2C3D4 SHIPPED</code>')
    return
  }

  const status = rawStatus.toUpperCase()

  if (!isOrderStatus(status)) {
    await sendMessage(
      chatId,
      `Statut invalide. Valides : <code>${ORDER_STATUSES.join('</code> <code>')}</code>`,
    )
    return
  }

  await sendChatAction(chatId)

  const order = await findOrder(ref)

  if (!order) {
    await sendMessage(chatId, `Commande introuvable : <code>${escapeHtml(ref)}</code>`)
    return
  }

  if (order.status === status) {
    await sendMessage(
      chatId,
      `La commande #${shortOrderId(order.id)} est deja ${statusBadge(status)}.`,
    )
    return
  }

  await proposeStatusChange(chatId, order, status)
}

/** Envoie la carte de confirmation d'un changement de statut (deux boutons). */
async function proposeStatusChange(
  chatId: number,
  order: OrderLookupRow,
  status: OrderStatus,
): Promise<void> {
  const keyboard: ReplyMarkup = {
    inline_keyboard: [
      [
        { text: `Confirmer ${status}`, callback_data: `setstatus:${order.id}:${status}` },
        { text: 'Annuler', callback_data: `cancel:${order.id}` },
      ],
    ],
  }

  await sendMessage(
    chatId,
    [
      '<b>Confirmer le changement de statut ?</b>',
      '',
      `Commande <b>#${shortOrderId(order.id)}</b> · ${escapeHtml(customerName(order.shipping_address))}`,
      `${statusBadge(order.status)} → ${statusBadge(status)}`,
    ].join('\n'),
    keyboard,
  )
}

async function cmdShip(chatId: number, args: string[]): Promise<void> {
  const ref = args[0]

  if (!ref) {
    await sendMessage(chatId, 'Usage : <code>/ship #A1B2C3D4</code>')
    return
  }

  await sendChatAction(chatId)

  const order = await findOrder(ref)

  if (!order) {
    await sendMessage(chatId, `Commande introuvable : <code>${escapeHtml(ref)}</code>`)
    return
  }

  if (order.status === 'SHIPPED') {
    await sendMessage(chatId, `La commande #${shortOrderId(order.id)} est deja expediee.`)
    return
  }

  await proposeStatusChange(chatId, order, 'SHIPPED')
}

async function cmdHelp(chatId: number): Promise<void> {
  await sendMessage(chatId, helpText())
}

async function handleCommand(chatId: number, text: string): Promise<void> {
  const [rawCommand, ...args] = text.trim().split(/\s+/)
  // Telegram ajoute « @botname » aux commandes d'un groupe.
  const command = rawCommand.replace(/@[\w_]+$/, '').toLowerCase()

  switch (command) {
    case '/start':
    case '/help':
      await cmdHelp(chatId)
      return
    case '/orders':
      await cmdOrders(chatId, args)
      return
    case '/order':
      await cmdOrder(chatId, args)
      return
    case '/stats':
      await cmdStats(chatId, args)
      return
    case '/stock':
      await cmdStock(chatId, args)
      return
    case '/setstatus':
      await cmdSetStatus(chatId, args)
      return
    case '/ship':
      await cmdShip(chatId, args)
      return
    default:
      await sendMessage(chatId, `Commande inconnue.\n\n${helpText()}`)
  }
}

async function handleCallback(query: TelegramCallbackQuery): Promise<void> {
  const chatId = query.message?.chat.id
  const messageId = query.message?.message_id
  const [action, ...rest] = (query.data ?? '').split(':')

  if (chatId === undefined || messageId === undefined) {
    await answerCallbackQuery(query.id)
    return
  }

  if (action === 'cancel') {
    await answerCallbackQuery(query.id, 'Annule.')
    await editMessageText(chatId, messageId, 'Changement annule.')
    return
  }

  if (action === 'setstatus') {
    const [orderId, status] = rest

    if (!orderId || !status || !isOrderStatus(status)) {
      await answerCallbackQuery(query.id, 'Requete invalide.')
      return
    }

    await answerCallbackQuery(query.id, 'Application…')

    try {
      await updateOrder(orderId, { status })
      revalidateCatalog()
      void notifyOrderStatusChange({ orderId, status }).catch(() => {})

      await editMessageText(
        chatId,
        messageId,
        `Commande <b>#${shortOrderId(orderId)}</b> → ${statusBadge(status)}`,
      )
    } catch (error) {
      console.error('telegram setstatus:', error)
      await editMessageText(chatId, messageId, 'Échec de la mise a jour.')
    }

    return
  }

  await answerCallbackQuery(query.id)
}

/** Point d'entree du webhook : route un update Telegram vers le bon handler. */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.message?.text) {
    const chatId = update.message.chat.id

    if (!isAllowedChat(chatId)) {
      await sendMessage(chatId, 'Acces refuse.')
      return
    }

    await handleCommand(chatId, update.message.text)
    return
  }

  const query = update.callback_query

  if (query) {
    if (!isAllowedChat(query.from.id) || !isAllowedChat(query.message?.chat.id)) {
      await answerCallbackQuery(query.id, 'Acces refuse.')
      return
    }

    await handleCallback(query)
  }
}

export { helpText }

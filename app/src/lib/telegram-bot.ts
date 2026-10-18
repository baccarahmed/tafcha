import 'server-only'

import { getSalesAnalytics, isCountedSale, type SalesPeriod } from './admin-analytics'
import {
  getAdminOrderDetail,
  isOrderStatus,
  isPaymentStatus,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
} from './admin-orders'
import { getSiteSettingsInput, type SiteSettingsInput } from './admin-settings'
import type { PromotionInput } from './admin-promotions'
import { insforgeAdmin } from './insforge-admin'
import { shortOrderId } from './notifications-types'
import {
  answerCallbackQuery,
  editMessageText,
  escapeHtml,
  isAllowedChat,
  sendChatAction,
  sendMessage,
  type TelegramCallbackQuery,
  type TelegramUpdate,
} from './telegram-api'
import { cancelAction, listRecentActions, proposeAction, runAction } from './telegram-actions'
import {
  addressField,
  customerName,
  formatDate,
  money,
  parseDateOnly,
  parseTunisDate,
  paymentBadge,
  productLabel,
  sizeLine,
  statusBadge,
  tunisStartOfDay,
} from './telegram-format'
import {
  findCustomerByEmail,
  findOrder,
  findProducts,
  findPromotions,
  listCustomers,
  listLowStock,
  listOrders,
  listProducts,
  listPromotions,
  type OrderLookup,
  type ProductLookup,
  type PromotionLookup,
} from './telegram-lookup'

/**
 * Bot Telegram a deux sens.
 *
 * Lecture : `/orders`, `/order`, `/stats`, `/stock`, `/products`, `/product`,
 * `/customers`, `/promos`, `/settings`, `/actions`.
 *
 * Ecriture : chaque commande se contente de *decrire* l'intention. Le message
 * de confirmation est envoye par `proposeAction`, qui persiste la proposition
 * en base ; l'ecriture n'a lieu qu'au clic sur « Confirmer », et les actions
 * destructrices demandent un second clic. Rien n'ecrit donc en base sans geste
 * explicite, et tout est journalise dans `telegram_actions`.
 *
 * Le controle d'acces est une allowlist de chats (`isAllowedChat`) : un update
 * d'un chat inconnu est refuse avant toute lecture.
 */

/* ------------------------------------------------------------------ */
/* Aides de saisie                                                     */
/* ------------------------------------------------------------------ */

/** Montant saisi a la francaise : « 1 250,50 » ou « 1250.5 ». */
function parseAmount(value: string | undefined): number | null {
  if (!value) return null

  const normalized = value.replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const parsed = Number.parseFloat(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

function parseBooleanFlag(value: string | undefined): boolean | null {
  const normalized = (value ?? '').toLowerCase()
  if (['on', 'oui', 'true', '1', 'active', 'activer'].includes(normalized)) return true
  if (['off', 'non', 'false', '0', 'inactive', 'desactiver'].includes(normalized)) return false

  return null
}

/**
 * Le texte libre : tout ce qui suit les arguments positionnels, « - » valant
 * « vide ». Sans cette convention, effacer une note obligerait a passer par le
 * dashboard.
 */
function restText(args: string[], from: number): string | null {
  // Sans argument du tout, on ne peut pas distinguer « efface » de « rien de
  // fourni » : on renvoie null pour que l'appelant affiche l'usage. Pour vider
  // un champ, il faut le tiret explicite (`/note REF -`).
  if (args.length <= from) return null

  const value = args.slice(from).join(' ').trim()

  return value === '-' ? '' : value
}

/* ------------------------------------------------------------------ */
/* Resolution des references                                           */
/* ------------------------------------------------------------------ */

async function resolveOrder(
  chatId: number,
  ref: string | undefined,
  usage: string,
): Promise<OrderLookup | null> {
  if (!ref) {
    await sendMessage(chatId, usage)
    return null
  }

  await sendChatAction(chatId)

  const order = await findOrder(ref)

  if (!order) {
    await sendMessage(chatId, `Commande introuvable : <code>${escapeHtml(ref)}</code>`)
    return null
  }

  return order
}

/**
 * Exige une correspondance unique.
 *
 * Une recherche par nom peut ramener plusieurs coloris : modifier « la Air
 * Max » quand trois fiches portent ce nom ecrirait sur la mauvaise. On prefere
 * afficher les candidats et demander la reference exacte.
 */
async function resolveProduct(
  chatId: number,
  ref: string | undefined,
  usage: string,
): Promise<ProductLookup | null> {
  if (!ref) {
    await sendMessage(chatId, usage)
    return null
  }

  await sendChatAction(chatId)

  const matches = await findProducts(ref)

  if (matches.length === 0) {
    await sendMessage(
      chatId,
      `Produit introuvable : <code>${escapeHtml(ref)}</code>\n` +
        `Cherchez avec <code>/products ${escapeHtml(ref)}</code>.`,
    )
    return null
  }

  if (matches.length > 1) {
    const list = matches
      .map(
        (match) =>
          `• <code>${match.id.slice(0, 8).toUpperCase()}</code> ${productLabel(match)} — ${money(match.price)}`,
      )
      .join('\n')

    await sendMessage(
      chatId,
      `Plusieurs produits correspondent à <code>${escapeHtml(ref)}</code> :\n\n${list}\n\n` +
        'Relancez avec la référence exacte.',
    )
    return null
  }

  return matches[0]
}

async function resolvePromotion(
  chatId: number,
  ref: string | undefined,
  usage: string,
): Promise<PromotionLookup | null> {
  if (!ref) {
    await sendMessage(chatId, usage)
    return null
  }

  await sendChatAction(chatId)

  const matches = await findPromotions(ref)

  if (matches.length === 0) {
    await sendMessage(chatId, `Promotion introuvable : <code>${escapeHtml(ref)}</code>`)
    return null
  }

  if (matches.length > 1) {
    const list = matches
      .map((promo) => `• <code>${promo.id.slice(0, 8).toUpperCase()}</code> ${escapeHtml(promo.name)}`)
      .join('\n')

    await sendMessage(chatId, `Plusieurs promotions correspondent :\n\n${list}`)
    return null
  }

  return matches[0]
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

function helpText(): string {
  return [
    `<b>Q2M · Bot boutique</b>`,
    ``,
    `<b>Lecture</b>`,
    `/orders <i>[n]</i> — dernières commandes`,
    `/order <i>REF</i> — détail d'une commande`,
    `/stats <i>[today|week|month]</i> — ventes`,
    `/stock <i>[seuil]</i> — bientôt en rupture`,
    `/products <i>[terme]</i> — catalogue`,
    `/product <i>REF</i> — fiche produit`,
    `/customers <i>[terme]</i> — clients`,
    `/promos — promotions`,
    `/settings — réglages vitrine`,
    `/actions <i>[n]</i> — journal du bot`,
    `/pending — brouillons IA en attente`,
    ``,
    `<b>Commandes</b>`,
    `/ship REF · /deliver REF · /cancel REF`,
    `/setstatus REF STATUT`,
    `/setpayment REF STATUT`,
    `/note REF <i>texte</i> (− pour effacer)`,
    `/delivery REF <i>AAAA-MM-JJ AAAA-MM-JJ</i> (− pour effacer)`,
    ``,
    `<b>Produits</b>`,
    `/setstock REF <i>42:5 43:3</i>`,
    `/addstock REF <i>42:5</i>`,
    `/setprice REF <i>185</i> <i>[compare]</i>`,
    `/activate REF · /deactivate REF`,
    `/feature REF <i>on|off</i> · /newdrop REF <i>on|off</i>`,
    `/duplicate REF <i>[coloris]</i>`,
    `/delproduct REF ⚠️`,
    ``,
    `<b>Clients</b>`,
    `/promote <i>email</i> · /demote <i>email</i> ⚠️`,
    ``,
    `<b>Promotions</b>`,
    `/promo_on ID · /promo_off ID`,
    `/promo_new <i>20 AAAA-MM-JJ AAAA-MM-JJ Nom</i> — globale`,
    `/promo_target ID REF <i>[REF…]</i>`,
    `/promo_del ID ⚠️`,
    ``,
    `<b>Vitrine</b>`,
    `/announce <i>texte</i> (− pour vider)`,
    `/maintenance <i>on|off</i>`,
    `/shipping <i>7</i> · /freeship <i>200</i>`,
    `/set <i>clé valeur</i> — hero_title, hero_subtitle, contact_email, contact_phone, contact_address`,
    ``,
    `<b>IA</b>`,
    `Envoyez une photo produit → analyse IA → confirmation`,
    ``,
    `⚠️ = double confirmation`,
    `Statuts : <code>${ORDER_STATUSES.join('</code> <code>')}</code>`,
    `Paiement : <code>${PAYMENT_STATUSES.join('</code> <code>')}</code>`,
  ].join('\n')
}

async function cmdHelp(chatId: number): Promise<void> {
  await sendMessage(chatId, helpText())
}

async function cmdOrders(chatId: number, args: string[]): Promise<void> {
  const parsed = Number.parseInt(args[0] ?? '', 10)
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 20) : 5

  await sendChatAction(chatId)

  const rows = await listOrders(limit)

  if (rows.length === 0) {
    await sendMessage(chatId, 'Aucune commande enregistrée.')
    return
  }

  const lines = rows.map((row) =>
    [
      `${statusBadge(row.status)} <b>#${row.shortId}</b> — ${money(row.total)}`,
      `${escapeHtml(customerName(row.shippingAddress))} · ${formatDate(row.createdAt)}`,
    ].join('\n'),
  )

  await sendMessage(chatId, `<b>Dernières commandes</b>\n\n${lines.join('\n\n')}`)
}

async function cmdOrder(chatId: number, args: string[]): Promise<void> {
  const order = await resolveOrder(chatId, args[0], 'Usage : <code>/order #A1B2C3D4</code>')
  if (!order) return

  const detail = await getAdminOrderDetail(order.id)
  const items = detail?.items ?? []
  const address = order.shippingAddress

  const itemLines = items.map((item) => {
    const colorway = item.colorway ? ` · ${escapeHtml(item.colorway)}` : ''

    return `• ${item.quantity}× ${escapeHtml(item.name ?? '—')}${colorway} — ${money(item.lineTotal)}`
  })

  const lines = [
    `<b>Commande #${shortOrderId(order.id)}</b>`,
    `Statut : ${statusBadge(order.status)}`,
    `Paiement : ${paymentBadge(order.paymentStatus)}${
      order.paymentMethod ? ` (${escapeHtml(order.paymentMethod)})` : ''
    }`,
    `Créée le ${formatDate(order.createdAt)}`,
  ]

  if (order.deliveryWindowStart || order.deliveryWindowEnd) {
    lines.push(
      `Livraison prévue : ${escapeHtml(formatDate(order.deliveryWindowStart ?? ''))} → ${escapeHtml(
        formatDate(order.deliveryWindowEnd ?? ''),
      )}`,
    )
  }

  lines.push(
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
    escapeHtml(
      [addressField(address, 'line1'), addressField(address, 'city'), addressField(address, 'postalCode')]
        .filter(Boolean)
        .join(', ') || '—',
    ),
  )

  if (order.notes) lines.push('', '<b>Note</b>', escapeHtml(order.notes))

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

  if (['today', 'jour', "aujourd'hui"].includes(scope)) {
    const { count, revenue } = await todaySummary()

    await sendMessage(
      chatId,
      [
        '<b>Aujourd’hui</b> (depuis minuit, heure de Tunis)',
        '',
        `Commandes : <b>${count}</b>`,
        `Chiffre d’affaires : <b>${money(revenue)}</b>`,
        `Panier moyen : ${money(count > 0 ? revenue / count : 0)}`,
      ].join('\n'),
    )
    return
  }

  const period: SalesPeriod = ['month', 'mois'].includes(scope) ? '1m' : '7d'
  const analytics = await getSalesAnalytics(period, 5)
  const { summary, topProducts } = analytics

  const lines = [
    `<b>${period === '1m' ? '30 derniers jours' : '7 derniers jours'}</b>`,
    '',
    `Commandes : <b>${summary.orderCount}</b>`,
    `Articles vendus : <b>${summary.unitsSold}</b>`,
    `Chiffre d’affaires : <b>${money(summary.revenue)}</b>`,
    `Panier moyen : ${money(summary.averageBasket)}`,
  ]

  if (topProducts.length > 0) {
    lines.push('', '<b>Top produits</b>')

    for (const product of topProducts) {
      const colorway = product.colorway ? ` · ${escapeHtml(product.colorway)}` : ''

      lines.push(
        `${product.rank}. ${escapeHtml(product.name)}${colorway} — ${product.unitsSold} u.`,
      )
    }
  }

  await sendMessage(chatId, lines.join('\n'))
}

async function cmdStock(chatId: number, args: string[]): Promise<void> {
  const parsed = Number.parseInt(args[0] ?? '', 10)
  const threshold = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 100) : 3

  await sendChatAction(chatId)

  const products = await listLowStock(threshold)

  if (products.length === 0) {
    await sendMessage(chatId, `Aucun produit actif sous ${threshold} unité(s).`)
    return
  }

  const lines = products.map(
    (product) =>
      `• ${productLabel(product)} — <b>${product.stock}</b>\n  <code>${sizeLine(product.sizes)}</code>`,
  )

  await sendMessage(chatId, `<b>Stock faible (≤ ${threshold})</b>\n\n${lines.join('\n')}`)
}

function productListLine(product: ProductLookup): string {
  const state = product.active ? '' : ' · ⛔️ inactif'

  return (
    `• <code>${product.id.slice(0, 8).toUpperCase()}</code> ${productLabel(product)} — ` +
    `${money(product.price)} · stock ${product.stock}${state}`
  )
}

async function cmdProducts(chatId: number, args: string[]): Promise<void> {
  const term = args.join(' ').trim()

  await sendChatAction(chatId)

  const products = term ? await findProducts(term, 20) : await listProducts(20)

  if (products.length === 0) {
    await sendMessage(chatId, `Aucun produit pour <code>${escapeHtml(term)}</code>.`)
    return
  }

  const header = term ? `<b>Produits · « ${escapeHtml(term)} »</b>` : '<b>Derniers produits</b>'

  await sendMessage(chatId, `${header}\n\n${products.map(productListLine).join('\n')}`)
}

async function cmdProduct(chatId: number, args: string[]): Promise<void> {
  const product = await resolveProduct(chatId, args[0], 'Usage : <code>/product REF</code>')
  if (!product) return

  const flags = [
    product.active ? '✅ actif' : '⛔️ inactif',
    product.featured ? '⭐ mis en avant' : null,
    product.isNewDrop ? '🆕 nouveau drop' : null,
    product.parentId ? '🎨 coloris' : null,
  ].filter(Boolean)

  const compare = product.comparePrice ? ` (barré ${money(product.comparePrice)})` : ''

  await sendMessage(
    chatId,
    [
      `<b>${productLabel(product)}</b>`,
      `Réf <code>${product.id.slice(0, 8).toUpperCase()}</code> · slug <code>${escapeHtml(product.slug)}</code>`,
      flags.join(' · '),
      '',
      `Prix : <b>${money(product.price)}</b>${compare}`,
      `Stock total : <b>${product.stock}</b>`,
      `Pointures : <code>${sizeLine(product.sizes)}</code>`,
    ].join('\n'),
  )
}

async function cmdCustomers(chatId: number, args: string[]): Promise<void> {
  const term = args.join(' ').trim()

  await sendChatAction(chatId)

  const customers = await listCustomers(term, 20)

  if (customers.length === 0) {
    await sendMessage(chatId, 'Aucun client correspondant.')
    return
  }

  const lines = customers.map(
    (customer) =>
      `• ${escapeHtml(customer.email)}${customer.role === 'ADMIN' ? ' · 👑' : ''}\n` +
      `  ${customer.orders} commande(s) · ${money(customer.spent)}`,
  )

  await sendMessage(chatId, `<b>Clients</b>\n\n${lines.join('\n')}`)
}

async function cmdPromos(chatId: number): Promise<void> {
  await sendChatAction(chatId)

  const promotions = await listPromotions()

  if (promotions.length === 0) {
    await sendMessage(chatId, 'Aucune promotion.')
    return
  }

  const lines = promotions.slice(0, 20).map((promo) => {
    const scope = promo.targets.includes('*') ? 'tout le catalogue' : `${promo.targets.length} cible(s)`

    return (
      `${promo.active ? '🟢' : '⚪️'} <code>${promo.id.slice(0, 8).toUpperCase()}</code> ` +
      `<b>${escapeHtml(promo.name)}</b> — ${promo.percentage}% · ${scope}\n` +
      `  ${formatDate(promo.startDate)} → ${formatDate(promo.endDate)}`
    )
  })

  await sendMessage(chatId, `<b>Promotions</b>\n\n${lines.join('\n')}`)
}

async function cmdSettings(chatId: number): Promise<void> {
  const settings = await getSiteSettingsInput()

  await sendMessage(
    chatId,
    [
      '<b>Réglages vitrine</b>',
      '',
      `Hero : <b>${escapeHtml(settings.heroTitle)}</b>`,
      settings.heroSubtitle ? `Sous-titre : ${escapeHtml(settings.heroSubtitle)}` : null,
      `Contact : ${escapeHtml(settings.contactEmail)}${settings.contactPhone ? ` · ${escapeHtml(settings.contactPhone)}` : ''}`,
      `Adresse : ${escapeHtml(settings.contactAddress)}`,
      `Livraison : ${money(settings.shippingCost)} · offerte dès ${money(settings.freeShippingThreshold)}`,
      `Maintenance : ${settings.maintenanceMode ? '🔧 activée' : '✅ désactivée'}`,
      `Annonce : ${settings.announcementEnabled ? `« ${escapeHtml(settings.announcementText)} »` : 'désactivée'}`,
    ]
      .filter(Boolean)
      .join('\n'),
  )
}

const ACTION_STATUS_BADGES: Record<string, string> = {
  PENDING: '⏳',
  APPLIED: '✅',
  CANCELLED: '❌',
  FAILED: '⚠️',
  EXPIRED: '🕐',
}

async function cmdActions(chatId: number, args: string[]): Promise<void> {
  const parsed = Number.parseInt(args[0] ?? '', 10)
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 30) : 10

  await sendChatAction(chatId)

  const actions = await listRecentActions(limit)

  if (actions.length === 0) {
    await sendMessage(chatId, 'Journal vide.')
    return
  }

  const lines = actions.map((action) => {
    const badge = ACTION_STATUS_BADGES[action.status] ?? '•'
    const error = action.error ? ` — <i>${escapeHtml(action.error)}</i>` : ''

    return `${badge} <code>${escapeHtml(action.command.slice(0, 60))}</code> · ${formatDate(action.createdAt)}${error}`
  })

  await sendMessage(chatId, `<b>Journal du bot</b>\n\n${lines.join('\n')}`)
}

/* ------------------------------------------------------------------ */
/* Ecritures (toujours via une confirmation)                           */
/* ------------------------------------------------------------------ */

async function proposeOrderUpdate(
  chatId: number,
  raw: string,
  order: OrderLookup,
  patch: {
    status?: OrderStatus
    paymentStatus?: string
    notes?: string | null
    deliveryWindowStart?: string | null
    deliveryWindowEnd?: string | null
  },
  summary: string,
): Promise<void> {
  await proposeAction(chatId, raw, {
    action: 'order.update',
    payload: { orderId: order.id, ref: shortOrderId(order.id), ...patch },
    summary,
  })
}

/** Carte commune : qui, et de quel etat vers quel etat. */
function orderHeader(order: OrderLookup): string {
  return (
    `Commande <b>#${shortOrderId(order.id)}</b> · ${escapeHtml(customerName(order.shippingAddress))}\n` +
    `${money(order.total)}`
  )
}

async function cmdSetOrderStatus(
  chatId: number,
  raw: string,
  args: string[],
  status: OrderStatus,
  usage: string,
): Promise<void> {
  const order = await resolveOrder(chatId, args[0], usage)
  if (!order) return

  if (order.status === status) {
    await sendMessage(chatId, `Commande #${shortOrderId(order.id)} est déjà ${statusBadge(status)}.`)
    return
  }

  await proposeOrderUpdate(
    chatId,
    raw,
    order,
    { status },
    `${orderHeader(order)}\n\n${statusBadge(order.status)} → ${statusBadge(status)}`,
  )
}

async function cmdSetstatus(chatId: number, raw: string, args: string[]): Promise<void> {
  const status = (args[1] ?? '').toUpperCase()

  if (!args[0] || !status) {
    await sendMessage(chatId, 'Usage : <code>/setstatus REF SHIPPED</code>')
    return
  }

  if (!isOrderStatus(status)) {
    await sendMessage(
      chatId,
      `Statut invalide. Valides : <code>${ORDER_STATUSES.join('</code> <code>')}</code>`,
    )
    return
  }

  await cmdSetOrderStatus(chatId, raw, args, status, 'Usage : <code>/setstatus REF STATUT</code>')
}

async function cmdSetpayment(chatId: number, raw: string, args: string[]): Promise<void> {
  const status = (args[1] ?? '').toUpperCase()

  if (!args[0] || !status) {
    await sendMessage(
      chatId,
      `Usage : <code>/setpayment REF STATUT</code>\nStatuts : <code>${PAYMENT_STATUSES.join('</code> <code>')}</code>`,
    )
    return
  }

  if (!isPaymentStatus(status)) {
    await sendMessage(
      chatId,
      `Statut de paiement invalide. Valides : <code>${PAYMENT_STATUSES.join('</code> <code>')}</code>`,
    )
    return
  }

  const order = await resolveOrder(chatId, args[0], 'Usage : <code>/setpayment REF STATUT</code>')
  if (!order) return

  await proposeOrderUpdate(
    chatId,
    raw,
    order,
    { paymentStatus: status },
    `${orderHeader(order)}\n\nPaiement : ${paymentBadge(order.paymentStatus)} → ${paymentBadge(status)}`,
  )
}

async function cmdNote(chatId: number, raw: string, args: string[]): Promise<void> {
  const note = restText(args, 1)

  if (args[0] === undefined || note === null) {
    await sendMessage(chatId, 'Usage : <code>/note REF texte</code> (ou <code>/note REF -</code>)')
    return
  }

  const order = await resolveOrder(chatId, args[0], 'Usage : <code>/note REF texte</code>')
  if (!order) return

  const summary = `${orderHeader(order)}\n\n` +
    (note.length === 0
      ? `Note : <s>${escapeHtml(order.notes ?? 'vide')}</s> → <b>effacée</b>`
      : `Note : ${order.notes ? `<s>${escapeHtml(order.notes)}</s> → ` : ''}<b>${escapeHtml(note)}</b>`)

  await proposeOrderUpdate(chatId, raw, order, { notes: note.length === 0 ? null : note }, summary)
}

async function cmdDelivery(chatId: number, raw: string, args: string[]): Promise<void> {
  const usage = 'Usage : <code>/delivery REF AAAA-MM-JJ AAAA-MM-JJ</code> (ou <code>/delivery REF -</code>)'

  if (args[0] === undefined) {
    await sendMessage(chatId, usage)
    return
  }

  const order = await resolveOrder(chatId, args[0], usage)
  if (!order) return

  if (args[1] === '-') {
    await proposeOrderUpdate(
      chatId,
      raw,
      order,
      { deliveryWindowStart: null, deliveryWindowEnd: null },
      `${orderHeader(order)}\n\nFenêtre de livraison : <s>${formatDate(order.deliveryWindowStart)} → ${formatDate(order.deliveryWindowEnd)}</s> → <b>effacée</b>`,
    )
    return
  }

  const start = args[1] ? parseDateOnly(args[1]) : null
  const end = args[2] ? parseDateOnly(args[2]) : null

  if (!start || !end) {
    await sendMessage(chatId, `Dates invalides.\n${usage}`)
    return
  }

  if (end <= start) {
    await sendMessage(chatId, 'La fin doit être postérieure au début.')
    return
  }

  await proposeOrderUpdate(
    chatId,
    raw,
    order,
    { deliveryWindowStart: start, deliveryWindowEnd: end },
    `${orderHeader(order)}\n\nFenêtre de livraison : <b>${formatDate(start)} → ${formatDate(end)}</b>`,
  )
}

const SIZE_PAIR_RE = /^(\d{2}(?:\.\d)?):(\d{1,5})$/
const SIZE_DELTA_RE = /^(\d{2}(?:\.\d)?):([+-]?\d{1,5})$/

/** Applique des mouvements de stock par pointure et propose l'ecriture. */
async function proposeStock(
  chatId: number,
  raw: string,
  args: string[],
  mode: 'set' | 'add',
): Promise<void> {
  const noun = mode === 'set' ? '/setstock' : '/addstock'
  const usage = `Usage : <code>${noun} REF 42:5 43:3</code>`

  if (args.length < 2) {
    await sendMessage(chatId, usage)
    return
  }

  const product = await resolveProduct(chatId, args[0], usage)
  if (!product) return

  if (product.sizes.length === 0) {
    await sendMessage(
      chatId,
      `${productLabel(product)} n’a aucune pointure déclarée : passez par le dashboard.`,
    )
    return
  }

  const moves: Array<{ size: number; stock: number }> = []
  const changes: string[] = []

  for (const token of args.slice(1)) {
    const match = (mode === 'set' ? SIZE_PAIR_RE : SIZE_DELTA_RE).exec(token)

    if (!match) {
      await sendMessage(
        chatId,
        `Format attendu : <code>42:5</code>. Reçu : <code>${escapeHtml(token)}</code>`,
      )
      return
    }

    const size = Number.parseFloat(match[1])
    const value = Number.parseInt(match[2], 10)
    const current = product.sizes.find((entry) => entry.size === size)

    if (!current) {
      await sendMessage(
        chatId,
        `La pointure ${size} n’existe pas sur ${productLabel(product)}.\n` +
          `Pointures : <code>${product.sizes.map((entry) => entry.size).join(' ')}</code>`,
      )
      return
    }

    const next = mode === 'set' ? value : Math.max(0, current.stock + value)
    moves.push({ size, stock: next })
    changes.push(`${size} : ${current.stock} → <b>${next}</b>`)
  }

  const sizes = product.sizes.map((entry) => {
    const move = moves.find((candidate) => candidate.size === entry.size)

    return move ? { size: entry.size, stock: move.stock } : entry
  })

  const nextStock = sizes.reduce((total, entry) => total + entry.stock, 0)

  await proposeAction(chatId, raw, {
    action: 'product.patch',
    payload: { id: product.id, name: `${product.name}${product.colorway ? ` · ${product.colorway}` : ''}`, patch: { sizes } },
    summary:
      `<b>${productLabel(product)}</b>\n\n${changes.join('\n')}\n\n` +
      `Stock total : ${product.stock} → <b>${nextStock}</b>`,
  })
}

async function cmdSetprice(chatId: number, raw: string, args: string[]): Promise<void> {
  const usage = 'Usage : <code>/setprice REF 185</code> ou <code>/setprice REF 185 220</code>'

  const price = parseAmount(args[1])
  if (args.length < 2 || price === null || price <= 0) {
    await sendMessage(chatId, `Prix invalide.\n${usage}`)
    return
  }

  const compare = args[2] === undefined ? undefined : parseAmount(args[2])

  if (compare !== undefined && (compare === null || compare <= 0)) {
    await sendMessage(chatId, `Prix barré invalide (0 pour le retirer).\n${usage}`)
    return
  }

  const product = await resolveProduct(chatId, args[0], usage)
  if (!product) return

  const comparePrice = compare === undefined || compare === 0 ? null : compare
  const patch: Record<string, unknown> = { price }
  if (args[2] !== undefined) patch.comparePrice = comparePrice

  const lines = [
    `<b>${productLabel(product)}</b>`,
    `Prix : ${money(product.price)} → <b>${money(price)}</b>`,
  ]

  if (args[2] !== undefined) {
    lines.push(
      comparePrice === null
        ? `Prix barré : <s>${money(product.comparePrice)}</s> → <b>aucun</b>`
        : `Prix barré : ${money(product.comparePrice)} → <b>${money(comparePrice)}</b>`,
    )
  }

  await proposeAction(chatId, raw, {
    action: 'product.patch',
    payload: { id: product.id, name: product.name, patch },
    summary: lines.join('\n'),
  })
}

/** Bascule d'un drapeau produit (active, featured, isNewDrop). */
async function cmdToggleProduct(
  chatId: number,
  raw: string,
  args: string[],
  field: 'active' | 'featured' | 'isNewDrop',
  value: boolean,
): Promise<void> {
  const usage = 'Usage : <code>/{commande} REF</code>'.replace('{commande}', raw.split(/\s+/)[0].slice(1))
  const product = await resolveProduct(chatId, args[0], usage)
  if (!product) return

  const current = product[field]
  if (current === value) {
    await sendMessage(chatId, `${productLabel(product)} a déjà ce réglage.`)
    return
  }

  const labels: Record<typeof field, string> = {
    active: 'Visibilité',
    featured: 'Mise en avant',
    isNewDrop: 'Nouveau drop',
  }

  await proposeAction(chatId, raw, {
    action: 'product.patch',
    payload: { id: product.id, name: product.name, patch: { [field]: value } },
    summary:
      `<b>${productLabel(product)}</b>\n\n${labels[field]} : ` +
      `${current ? 'activé' : 'désactivé'} → <b>${value ? 'activé' : 'désactivé'}</b>`,
  })
}

async function cmdDuplicate(chatId: number, raw: string, args: string[]): Promise<void> {
  const product = await resolveProduct(chatId, args[0], 'Usage : <code>/duplicate REF [coloris]</code>')
  if (!product) return

  const colorway = restText(args, 1) ?? ''

  await proposeAction(chatId, raw, {
    action: 'product.duplicate',
    payload: { id: product.id, colorway: colorway || null },
    summary:
      `<b>${productLabel(product)}</b>\n\n` +
      `Créer un coloris${colorway ? ` <b>${escapeHtml(colorway)}</b>` : ''} (stock à zéro, visuels vides)`,
    hint: 'Le coloris reprend prix, pointures et descriptions : complétez les visuels ensuite.',
  })
}

async function cmdDelproduct(chatId: number, raw: string, args: string[]): Promise<void> {
  const product = await resolveProduct(chatId, args[0], 'Usage : <code>/delproduct REF</code>')
  if (!product) return

  await proposeAction(chatId, raw, {
    action: 'product.delete',
    payload: { id: product.id, name: product.name },
    summary: `<b>🗑 Supprimer ${productLabel(product)}</b>\n\nRéf <code>${product.id.slice(0, 8).toUpperCase()}</code> · stock ${product.stock}`,
    danger: 'destructive',
  })
}

async function cmdUserRole(
  chatId: number,
  raw: string,
  args: string[],
  role: 'ADMIN' | 'CUSTOMER',
): Promise<void> {
  const usage = `Usage : <code>/${role === 'ADMIN' ? 'promote' : 'demote'} email</code>`
  const email = args[0]?.trim()

  if (!email) {
    await sendMessage(chatId, usage)
    return
  }

  await sendChatAction(chatId)

  const customer = await findCustomerByEmail(email)

  if (!customer) {
    await sendMessage(chatId, `Aucun compte pour <code>${escapeHtml(email)}</code>.`)
    return
  }

  if (customer.role === role) {
    await sendMessage(chatId, `${escapeHtml(customer.email)} est déjà ${role}.`)
    return
  }

  await proposeAction(chatId, raw, {
    action: 'user.role',
    payload: { userId: customer.id, email: customer.email, role },
    summary:
      `<b>${escapeHtml(customer.email)}</b>\n\nRôle : ${customer.role} → <b>${role}</b>`,
    danger: role === 'CUSTOMER' ? 'destructive' : 'normal',
  })
}

async function cmdPromoActive(
  chatId: number,
  raw: string,
  args: string[],
  active: boolean,
): Promise<void> {
  const noun = `promo_${active ? 'on' : 'off'}`
  const promo = await resolvePromotion(chatId, args[0], `Usage : <code>/${noun} ID</code>`)
  if (!promo) return

  if (promo.active === active) {
    await sendMessage(chatId, `« ${escapeHtml(promo.name)} » est déjà ${active ? 'active' : 'inactive'}.`)
    return
  }

  await proposeAction(chatId, raw, {
    action: 'promotion.active',
    payload: { id: promo.id, name: promo.name, active },
    summary:
      `<b>${escapeHtml(promo.name)}</b> — ${promo.percentage}%\n\n` +
      `État : ${promo.active ? 'active' : 'inactive'} → <b>${active ? 'active' : 'inactive'}</b>`,
  })
}

async function cmdPromoSave(
  chatId: number,
  raw: string,
  promo: PromotionLookup | null,
  input: PromotionInput,
  summary: string,
): Promise<void> {
  await proposeAction(chatId, raw, {
    action: 'promotion.save',
    payload: promo
      ? { id: promo.id, input, name: input.name }
      : { input, name: input.name },
    summary,
  })
}

function toPromotionInput(promo: PromotionLookup, patch: Partial<PromotionInput> = {}): PromotionInput {
  const fallback = new Date().toISOString()

  return {
    name: promo.name,
    description: promo.description,
    type: promo.type === 'CATEGORY' ? 'CATEGORY' : 'PRODUCT',
    targets: promo.targets,
    percentage: promo.percentage,
    startDate: promo.startDate ?? fallback,
    endDate: promo.endDate ?? fallback,
    active: promo.active,
    announcementText: promo.announcementText,
    ...patch,
  }
}

async function cmdPromoNew(chatId: number, raw: string, args: string[]): Promise<void> {
  const usage = 'Usage : <code>/promo_new 20 AAAA-MM-JJ AAAA-MM-JJ Nom de la promotion</code>'
  const percentage = parseAmount(args[0])
  const name = restText(args, 3)
  const start = args[1] ? parseTunisDate(args[1], false) : null
  const end = args[2] ? parseTunisDate(args[2], true) : null

  if (!Number.isFinite(percentage) || percentage === null || percentage <= 0 || percentage > 100) {
    await sendMessage(chatId, `Pourcentage invalide (1 à 100).\n${usage}`)
    return
  }

  if (!name || name.trim().length < 2 || !start || !end) {
    await sendMessage(chatId, `Arguments incomplets.\n${usage}`)
    return
  }

  if (Date.parse(end) <= Date.parse(start)) {
    await sendMessage(chatId, 'La fin doit être postérieure au début.')
    return
  }

  const input: PromotionInput = {
    name,
    description: null,
    type: 'CATEGORY',
    targets: ['*'],
    percentage,
    startDate: start,
    endDate: end,
    active: true,
    announcementText: null,
  }

  await cmdPromoSave(
    chatId,
    raw,
    null,
    input,
    `<b>Nouvelle promotion « ${escapeHtml(name)} »</b>\n\n` +
      `${percentage}% sur <b>tout le catalogue</b>\n` +
      `${formatDate(start)} → ${formatDate(end)}\n` +
      'Statut : active',
  )
}

async function cmdPromoTarget(chatId: number, raw: string, args: string[]): Promise<void> {
  const promoRef = args[0]
  const productRefs = args.slice(1)

  const usage = 'Usage : <code>/promo_target ID REF [REF…]</code>'

  if (!promoRef || productRefs.length === 0) {
    await sendMessage(chatId, usage)
    return
  }

  const promo = await resolvePromotion(chatId, promoRef, usage)
  if (!promo) return

  const targets: string[] = []
  const names: string[] = []

  for (const ref of productRefs) {
    const product = await resolveProduct(chatId, ref, usage)
    if (!product) return

    targets.push(product.id)
    names.push(productLabel(product))
  }

  await cmdPromoSave(
    chatId,
    raw,
    promo,
    toPromotionInput(promo, { type: 'PRODUCT', targets }),
    `<b>« ${escapeHtml(promo.name)} »</b> — ciblage\n\n` +
      `Ancien : ${promo.targets.includes('*') ? 'tout le catalogue' : `${promo.targets.length} produit(s)`}\n` +
      `Nouveau : <b>${promo.percentage}% sur ${names.length} produit(s)</b>\n${names.join('\n')}`,
  )
}

async function cmdPromoDelete(chatId: number, raw: string, args: string[]): Promise<void> {
  const promo = await resolvePromotion(chatId, args[0], 'Usage : <code>/promo_del ID</code>')
  if (!promo) return

  await proposeAction(chatId, raw, {
    action: 'promotion.delete',
    payload: { id: promo.id, name: promo.name },
    summary:
      `<b>🗑 Supprimer « ${escapeHtml(promo.name)} »</b>\n\n` +
      `${promo.percentage}% · ${promo.targets.includes('*') ? 'tout le catalogue' : `${promo.targets.length} cible(s)`}\n` +
      `${formatDate(promo.startDate)} → ${formatDate(promo.endDate)}`,
    danger: 'destructive',
  })
}

/* ------------------------------------------------------------------ */
/* Reglages vitrine                                                    */
/* ------------------------------------------------------------------ */

/**
 * Propose une modification de reglages.
 *
 * Le payload ne transporte que les champs touches : le runner relit la ligne a
 * l'execution, donc confirmer deux propositions coup sur coup ne fait pas
 * perdre la premiere, et une modification faite entre-temps dans le dashboard
 * est conservee.
 */
async function proposeSetting(
  chatId: number,
  raw: string,
  changes: Record<string, string | number | boolean>,
  label: string,
  summary: string,
): Promise<void> {
  await proposeAction(chatId, raw, {
    action: 'settings.save',
    payload: { changes, label },
    summary,
  })
}

async function cmdAnnounce(chatId: number, raw: string, args: string[]): Promise<void> {
  const text = restText(args, 0)

  if (text === null) {
    await sendMessage(chatId, 'Usage : <code>/announce Votre texte</code> (ou <code>/announce -</code>)')
    return
  }

  const current = await getSiteSettingsInput()

  if (text.length === 0) {
    await proposeSetting(
      chatId,
      raw,
      { announcementEnabled: false },
      'annonce désactivée',
      `Bandeau d’annonce : <s>${escapeHtml(current.announcementText || 'vide')}</s> → <b>désactivé</b>`,
    )
    return
  }

  await proposeSetting(
    chatId,
    raw,
    { announcementText: text, announcementEnabled: true },
    `annonce « ${text.slice(0, 40)} »`,
    `Bandeau d’annonce${current.announcementEnabled ? ` : <s>${escapeHtml(current.announcementText)}</s> →` : ' :'}\n` +
      `<b>${escapeHtml(text)}</b>`,
  )
}

async function cmdMaintenance(chatId: number, raw: string, args: string[]): Promise<void> {
  const value = parseBooleanFlag(args[0])

  if (value === null) {
    await sendMessage(chatId, 'Usage : <code>/maintenance on|off</code>')
    return
  }

  const current = await getSiteSettingsInput()

  await proposeSetting(
    chatId,
    raw,
    { maintenanceMode: value },
    value ? 'maintenance activée' : 'maintenance désactivée',
    `Mode maintenance : ${current.maintenanceMode ? 'activé' : 'désactivé'} → ` +
      `<b>${value ? 'activé' : 'désactivé'}</b>` +
      (value ? '\n\n⚠️ La vitrine devient inaccessible aux visiteurs.' : ''),
  )
}

async function cmdShipping(chatId: number, raw: string, args: string[], kind: 'cost' | 'threshold'): Promise<void> {
  const noun = kind === 'cost' ? 'shipping' : 'freeship'
  const usage = `Usage : <code>/${noun} montant</code>`
  const amount = parseAmount(args[0])

  if (amount === null) {
    await sendMessage(chatId, usage)
    return
  }

  const current = await getSiteSettingsInput()

  await proposeSetting(
    chatId,
    raw,
    kind === 'cost' ? { shippingCost: amount } : { freeShippingThreshold: amount },
    kind === 'cost' ? 'frais de livraison' : 'seuil de livraison offerte',
    kind === 'cost'
      ? `Frais de livraison : ${money(current.shippingCost)} → <b>${money(amount)}</b>`
      : `Livraison offerte dès : ${money(current.freeShippingThreshold)} → <b>${money(amount)}</b>`,
  )
}

const SETTING_FIELDS: Record<string, { field: string; label: string }> = {
  hero_title: { field: 'heroTitle', label: 'titre du hero' },
  hero_subtitle: { field: 'heroSubtitle', label: 'sous-titre du hero' },
  contact_email: { field: 'contactEmail', label: 'e-mail de contact' },
  contact_phone: { field: 'contactPhone', label: 'téléphone de contact' },
  contact_address: { field: 'contactAddress', label: 'adresse de contact' },
}

async function cmdSet(chatId: number, raw: string, args: string[]): Promise<void> {
  const key = (args[0] ?? '').toLowerCase()
  const value = restText(args, 1)

  if (!key || value === null) {
    await sendMessage(
      chatId,
      `Usage : <code>/set clé valeur</code>\nClés : <code>${Object.keys(SETTING_FIELDS).join('</code> <code>')}</code>`,
    )
    return
  }

  const field = SETTING_FIELDS[key]

  if (!field) {
    await sendMessage(
      chatId,
      `Clé inconnue. Valides : <code>${Object.keys(SETTING_FIELDS).join('</code> <code>')}</code>`,
    )
    return
  }

  const current = await getSiteSettingsInput()
  const before = currentValueOf(current, key)

  await proposeSetting(
    chatId,
    raw,
    { [field.field]: value },
    field.label,
    `<b>${escapeHtml(field.label)}</b>\n\n<i>${escapeHtml(before || 'vide')}</i> → <b>${escapeHtml(value || 'vide')}</b>`,
  )
}

/** Valeur courante affichee dans la confirmation d'un `/set`. */
function currentValueOf(settings: SiteSettingsInput, key: string): string {
  switch (key) {
    case 'hero_title':
      return settings.heroTitle
    case 'hero_subtitle':
      return settings.heroSubtitle
    case 'contact_email':
      return settings.contactEmail
    case 'contact_phone':
      return settings.contactPhone
    case 'contact_address':
      return settings.contactAddress
  }

  return ''
}

/* ------------------------------------------------------------------ */
/* Routage                                                             */
/* ------------------------------------------------------------------ */

async function dispatch(chatId: number, command: string, args: string[], raw: string): Promise<void> {
  switch (command) {
    // Lecture
    case '/start':
    case '/help':
      return cmdHelp(chatId)
    case '/orders':
      return cmdOrders(chatId, args)
    case '/order':
      return cmdOrder(chatId, args)
    case '/stats':
      return cmdStats(chatId, args)
    case '/stock':
      return cmdStock(chatId, args)
    case '/products':
      return cmdProducts(chatId, args)
    case '/product':
      return cmdProduct(chatId, args)
    case '/customers':
      return cmdCustomers(chatId, args)
    case '/promos':
      return cmdPromos(chatId)
    case '/settings':
      return cmdSettings(chatId)
    case '/actions':
      return cmdActions(chatId, args)

    // Commandes
    case '/ship':
      return cmdSetOrderStatus(chatId, raw, args, 'SHIPPED', 'Usage : <code>/ship REF</code>')
    case '/deliver':
      return cmdSetOrderStatus(chatId, raw, args, 'DELIVERED', 'Usage : <code>/deliver REF</code>')
    case '/cancel':
      return cmdSetOrderStatus(chatId, raw, args, 'CANCELLED', 'Usage : <code>/cancel REF</code>')
    case '/setstatus':
      return cmdSetstatus(chatId, raw, args)
    case '/setpayment':
      return cmdSetpayment(chatId, raw, args)
    case '/note':
      return cmdNote(chatId, raw, args)
    case '/delivery':
      return cmdDelivery(chatId, raw, args)

    // Produits
    case '/setstock':
      return proposeStock(chatId, raw, args, 'set')
    case '/addstock':
      return proposeStock(chatId, raw, args, 'add')
    case '/setprice':
      return cmdSetprice(chatId, raw, args)
    case '/activate':
      return cmdToggleProduct(chatId, raw, args, 'active', true)
    case '/deactivate':
      return cmdToggleProduct(chatId, raw, args, 'active', false)
    case '/feature': {
      const value = parseBooleanFlag(args[1])
      if (value === null) return sendMessage(chatId, 'Usage : <code>/feature REF on|off</code>')
      return cmdToggleProduct(chatId, raw, args, 'featured', value)
    }
    case '/newdrop': {
      const value = parseBooleanFlag(args[1])
      if (value === null) return sendMessage(chatId, 'Usage : <code>/newdrop REF on|off</code>')
      return cmdToggleProduct(chatId, raw, args, 'isNewDrop', value)
    }
    case '/duplicate':
      return cmdDuplicate(chatId, raw, args)
    case '/delproduct':
      return cmdDelproduct(chatId, raw, args)

    // IA
    case '/pending':
      return cmdPending(chatId)

    // Clients
    case '/promote':
      return cmdUserRole(chatId, raw, args, 'ADMIN')
    case '/demote':
      return cmdUserRole(chatId, raw, args, 'CUSTOMER')

    // Promotions
    case '/promo_on':
      return cmdPromoActive(chatId, raw, args, true)
    case '/promo_off':
      return cmdPromoActive(chatId, raw, args, false)
    case '/promo_new':
      return cmdPromoNew(chatId, raw, args)
    case '/promo_target':
      return cmdPromoTarget(chatId, raw, args)
    case '/promo_del':
      return cmdPromoDelete(chatId, raw, args)

    // Vitrine
    case '/announce':
      return cmdAnnounce(chatId, raw, args)
    case '/maintenance': {
      return cmdMaintenance(chatId, raw, args)
    }
    case '/shipping':
      return cmdShipping(chatId, raw, args, 'cost')
    case '/freeship':
      return cmdShipping(chatId, raw, args, 'threshold')
    case '/set':
      return cmdSet(chatId, raw, args)

    default:
      return sendMessage(chatId, `Commande inconnue : <code>${escapeHtml(command)}</code>\n\n${helpText()}`)
  }
}

async function handleCommand(chatId: number, text: string): Promise<void> {
  const [rawCommand, ...args] = text.trim().split(/\s+/)
  // Telegram ajoute « @botname » aux commandes d'un groupe ; on accepte aussi
  // le tiret pour que `/promo-on` fonctionne comme `/promo_on`.
  const command = rawCommand.replace(/@[\w_]+$/, '').replace(/-/g, '_').toLowerCase()

  try {
    await dispatch(chatId, command, args, text.trim())
  } catch (error) {
    console.error(`telegram ${command}:`, error)

    await sendMessage(
      chatId,
      `⚠️ ${escapeHtml(error instanceof Error ? error.message : 'Erreur inconnue.')}`,
    )
  }
}

/**
 * Gestion des photos envoyées par l'admin.
 * Flux : photo → upload → analyse IA → formulaire Telegram → confirmation.
 */
async function handlePhoto(chatId: number, photo: Array<{ file_id: string; file_size?: number }>): Promise<void> {
  // Prendre la plus grande photo (dernière du tableau)
  const largest = photo[photo.length - 1]
  if (!largest) {
    await sendMessage(chatId, 'Aucune photo reçue.')
    return
  }

  if (largest.file_size && largest.file_size > 4 * 1024 * 1024) {
    await sendMessage(chatId, 'Image trop lourde (max 4 Mo).')
    return
  }

  // Télécharger la photo depuis Telegram
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    await sendMessage(chatId, 'Bot non configuré.')
    return
  }

  await sendChatAction(chatId)

  try {
    // 1. Récupérer le fichier
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${largest.file_id}`)
    const fileData = await fileRes.json() as { ok: boolean; result?: { file_path: string } }
    if (!fileData.ok || !fileData.result?.file_path) {
      await sendMessage(chatId, 'Impossible de récupérer la photo.')
      return
    }

    // 2. Télécharger l'image
    const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`)
    if (!imgRes.ok) {
      await sendMessage(chatId, 'Échec du téléchargement.')
      return
    }

    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = imgRes.headers.get('content-type') ?? 'image/jpeg'

    // 3. Upload + analyse IA
    const { createProductDraft } = await import('./telegram-products')
    const draft = await createProductDraft({
      chatId,
      imageBase64: base64,
      mimeType,
      locale: 'fr',
    })

    // 4. Envoyer le formulaire de confirmation
    const d = draft.draft
    const summary = [
      `<b>Nouveau produit IA</b>`,
      '',
      `Nom : <b>${escapeHtml(d.name)}</b>`,
      `Marque : ${escapeHtml(d.brand)}`,
      `SKU : <code>${escapeHtml(d.sku)}</code>`,
      `Coloris : ${escapeHtml(d.colorway)}`,
      `Description : ${escapeHtml(d.description)}`,
      `Genre : ${escapeHtml(d.gender)}`,
      `Palette : ${escapeHtml(d.palette)}`,
    ].join('\n')

    await proposeAction(chatId, '/newproduct', {
      action: 'product.create',
      payload: { draftId: draft.id, imageUrl: draft.image_url, name: d.name },
      summary,
      hint: 'Le produit sera créé inactif, sans prix ni pointures. Complétez depuis le dashboard.',
    })

    await sendMessage(chatId, summary, {
      inline_keyboard: [[
        { text: '✅ Confirmer', callback_data: `run:${draft.id}` },
        { text: '❌ Annuler', callback_data: `drop:${draft.id}` },
      ]],
    })
  } catch (error) {
    console.error('handlePhoto:', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    await sendMessage(chatId, `⚠️ ${escapeHtml(message)}`)
  }
}

/**
 * Liste les brouillons en attente.
 */
async function cmdPending(chatId: number): Promise<void> {
  const { listPendingDrafts } = await import('./telegram-products')
  const drafts = await listPendingDrafts(chatId)

  if (drafts.length === 0) {
    await sendMessage(chatId, 'Aucun brouillon en attente.')
    return
  }

  const lines = drafts.map((d) => {
    const draft = d.draft as { name?: string }
    return `• ${escapeHtml(draft.name ?? '—')} · ${formatDate(d.created_at)}`
  })

  await sendMessage(chatId, `<b>Brouillons en attente</b>\n\n${lines.join('\n')}`)
}

async function handleCallback(query: TelegramCallbackQuery): Promise<void> {
  const chatId = query.message?.chat.id
  const messageId = query.message?.message_id
  const [action, id] = (query.data ?? '').split(':')

  if (chatId === undefined || messageId === undefined) {
    await answerCallbackQuery(query.id)
    return
  }

  if (!id || !['run', 'run2', 'drop'].includes(action)) {
    await answerCallbackQuery(query.id, 'Bouton obsolète.')
    return
  }

  try {
    if (action === 'drop') {
      const outcome = await cancelAction(id, chatId)

      await answerCallbackQuery(query.id, 'Annulé')
      await editMessageText(chatId, messageId, outcome.text)
      return
    }

    await answerCallbackQuery(query.id, action === 'run2' ? 'Application…' : '')

    const outcome = await runAction(id, chatId, action === 'run2')

    await editMessageText(chatId, messageId, outcome.text, outcome.keyboard)
  } catch (error) {
    console.error('telegram callback:', error)
    await answerCallbackQuery(query.id, 'Erreur')
  }
}

/** Point d'entree du webhook : route un update Telegram vers le bon handler. */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message

  // Photo envoyée par l'admin → analyse IA
  if (message?.photo && message.photo.length > 0) {
    const chatId = message.chat.id

    if (!isAllowedChat(chatId)) {
      await sendMessage(chatId, 'Accès refusé.')
      return
    }

    await handlePhoto(chatId, message.photo)
    return
  }

  // Texte
  if (message?.text) {
    const chatId = message.chat.id

    if (!isAllowedChat(chatId)) {
      await sendMessage(chatId, 'Accès refusé.')
      return
    }

    await handleCommand(chatId, message.text)
    return
  }

  // Callback (boutons Confirmer/Annuler)
  const query = update.callback_query

  if (query) {
    if (!isAllowedChat(query.from.id) || !isAllowedChat(query.message?.chat.id)) {
      await answerCallbackQuery(query.id, 'Accès refusé.')
      return
    }

    await handleCallback(query)
  }
}

export { helpText }

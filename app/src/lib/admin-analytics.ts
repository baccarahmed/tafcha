import 'server-only'

import { insforgeAdmin } from '@/lib/insforge-admin'

/**
 * Analytique de vente par periode.
 *
 * Le dashboard ne lit jamais `order_items` directement : tout passe par ici pour
 * que la definition de « vendu » reste identique entre le classement produits,
 * le chiffre d'affaires et les compteurs de commandes.
 *
 * Regle retenue : une vente est validee si la commande n'est pas annulee et si
 * son paiement n'a pas echoue ni ete rembourse. Les commandes en attente de
 * paiement comptent donc, car une commande cash livree n'est jamais « PAID » en
 * base — les exclure ferait perdre l'essentiel du chiffre d'affaires tunisien.
 */

export type SalesPeriod = '7d' | '1m' | '6m'

export const SALES_PERIODS: SalesPeriod[] = ['7d', '1m', '6m']

/** Statuts de commande qui ne representent pas une vente. */
const EXCLUDED_STATUSES = ['CANCELLED']

/** Etats de paiement qui ne representent pas une vente. */
const EXCLUDED_PAYMENT_STATUSES = ['FAILED', 'REFUNDED']

export interface SalesPeriodSummary {
  period: SalesPeriod
  /** Instant de debut de la fenetre, en ISO. */
  since: string
  orderCount: number
  unitsSold: number
  revenue: number
  /** Panier moyen sur la fenetre, 0 si aucune commande. */
  averageBasket: number
}

export interface TopSoldProductRow {
  productId: string
  name: string
  slug: string
  sku: string | null
  brand: string | null
  colorway: string | null
  coverImage: string | null
  unitsSold: number
  revenue: number
  /** Part des unites vendues sur la periode, en pourcentage. */
  share: number
  /** Rang 1..N, affiche tel quel dans le tableau. */
  rank: number
}

export interface RevenuePoint {
  /** Cle de bucket au format AAAA-MM-JJ (quotidien) ou AAAA-Sxx (hebdo). */
  key: string
  label: string
  value: number
}

export interface SalesAnalytics {
  summary: SalesPeriodSummary
  topProducts: TopSoldProductRow[]
  series: RevenuePoint[]
}

/** Decremente de `months` mois calendaires, pas de 30 jours fixes. */
function subtractMonths(reference: Date, months: number): Date {
  const date = new Date(reference)
  date.setMonth(date.getMonth() - months)
  return date
}

export function periodStart(period: SalesPeriod, now = new Date()): Date {
  switch (period) {
    case '7d': {
      const date = new Date(now)
      date.setDate(date.getDate() - 7)
      return date
    }
    case '1m':
      return subtractMonths(now, 1)
    case '6m':
      return subtractMonths(now, 6)
  }
}

export function isSalesPeriod(value: string | undefined | null): value is SalesPeriod {
  return value === '7d' || value === '1m' || value === '6m'
}

/**
 * Regle unique de « cette commande compte comme vente ».
 *
 * Exposee car le back-office additionne aussi des totaux (panneau, fiche client,
 * chiffre d'affaires de la page commandes) : sans fonction partagee, chaque
 * ecran developperait son propre filtre et afficherait des chiffres
 * differents pour la meme boutique.
 */
export function isCountedSale(
  status: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  if (status && EXCLUDED_STATUSES.includes(status)) return false
  if (paymentStatus && EXCLUDED_PAYMENT_STATUSES.includes(paymentStatus)) return false
  return true
}

interface EligibleOrderRow {
  id: string
  total: number | null
  created_at: string
}

/**
 * Charge les commandes validées de la fenetre.
 *
 * Le filtre `created_at` est pousse en base : sur six mois d'activite, charger
 * toutes les commandes pour les filtrer ensuite en memoire serait le principal
 * poste de cout de la page.
 */
async function loadEligibleOrders(since: Date): Promise<EligibleOrderRow[]> {
  const db = insforgeAdmin().database

  const { data, error } = await db
    .from('orders')
    .select('id,total,created_at')
    .gte('created_at', since.toISOString())
    .not('status', 'in', `(${EXCLUDED_STATUSES.join(',')})`)
    .not('payment_status', 'in', `(${EXCLUDED_PAYMENT_STATUSES.join(',')})`)

  if (error) throw new Error(`orders: ${error.message}`)

  return (data ?? []) as EligibleOrderRow[]
}

interface OrderItemRow {
  order_id: string
  product_id: string
  quantity: number
  price: number | null
}

/**
 * Charge les lignes de commande des commandes eligibles.
 *
 * Le SDK renvoie les agregats de `numeric` sous forme de chaine : la conversion
 * est faite ici, une fois, plutot que dans chaque page qui lit le montant.
 */
async function loadOrderItems(orderIds: string[]): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return []

  const db = insforgeAdmin().database

  const { data, error } = await db
    .from('order_items')
    .select('order_id,product_id,quantity,price')
    .in('order_id', orderIds)

  if (error) throw new Error(`order_items: ${error.message}`)

  return (data ?? []) as OrderItemRow[]
}

interface ProductRow {
  id: string
  slug: string
  name: string
  sku: string | null
  brand: string | null
  colorway: string | null
  images: string[] | null
}

/**
 * Serie de revenus alignee sur la fenetre.
 *
 * 7 jours et 1 mois sont bucketises par jour, 6 mois par semaine : un histogramme
 * de 180 barres serait illisible, alors qu'un releve hebdomadaire reste lisible
 * et se compare d'un trimestre a l'autre.
 *
 * Les buckets partent de `periodStart()` — exactement la borne utilisee par le
 * resume et le classement — sinon la courbe debuterait avant la fenetre et le
 * total de ses barres ne correspondrait jamais au chiffre d'annonce.
 */
function buildSeries(
  orders: EligibleOrderRow[],
  period: SalesPeriod,
  now: Date,
): RevenuePoint[] {
  const start = periodStart(period, now)
  const step = period === '6m' ? 7 : 1
  const buckets = new Map<string, number>()

  for (
    const cursor = new Date(start);
    cursor <= now;
    cursor.setDate(cursor.getDate() + step)
  ) {
    buckets.set(bucketKey(cursor, step), 0)
  }

  for (const order of orders) {
    const key = bucketKey(new Date(order.created_at), step)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + toAmount(order.total))
  }

  return [...buckets.entries()].map(([key, value]) => ({
    key,
    label: key.slice(5),
    value,
  }))
}

/** Cle de bucket : jour pour un releve quotidien, semaine ISO pour un releve hebdo. */
function bucketKey(date: Date, step: number): string {
  return step === 7 ? isoWeek(date) : date.toISOString().slice(0, 10)
}

/** Cle de semaine ISO compactee : AAAA-Sxx. */
function isoWeek(date: Date): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNumber = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNumber + 3)
  const isoYear = target.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4))
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    )
  return `${isoYear}-S${String(week).padStart(2, '0')}`
}

function toAmount(value: number | string | null | undefined): number {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : value
  return Number.isFinite(amount) ? (amount as number) : 0
}

/**
 * Compte les commandes validées d'une periode sans charger les lignes.
 *
 * Utilise par les compteurs des onglets : lire les `order_items` pour compter
 * des commandes multiplierait le cout de la page par trois pour un chiffre
 * qui se resume a un `COUNT`.
 */
export async function countOrdersInPeriod(
  period: SalesPeriod,
  now = new Date()
): Promise<number> {
  const { count, error } = await insforgeAdmin()
    .database.from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', periodStart(period, now).toISOString())
    .not('status', 'in', `(${EXCLUDED_STATUSES.join(',')})`)
    .not('payment_status', 'in', `(${EXCLUDED_PAYMENT_STATUSES.join(',')})`)

  if (error) throw new Error(`orders: ${error.message}`)

  return count ?? 0
}

/**
 * Analyse complete d'une periode.
 *
 * Une seule fonction pour le resume, le classement et la courbe : les trois
 * affichages derivent du meme jeu de commandes, donc ils ne peuvent pas se
 * contredire.
 */
export async function getSalesAnalytics(
  period: SalesPeriod,
  limit = 10,
  now = new Date(),
): Promise<SalesAnalytics> {
  const since = periodStart(period, now)
  const orders = await loadEligibleOrders(since)

  const items = await loadOrderItems(orders.map((order) => order.id))

  const revenue = orders.reduce((sum, order) => sum + toAmount(order.total), 0)
  const unitsSold = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)

  const topProducts = await rankProducts(items, unitsSold, limit)

  return {
    summary: {
      period,
      since: since.toISOString(),
      orderCount: orders.length,
      unitsSold,
      revenue,
      averageBasket: orders.length > 0 ? revenue / orders.length : 0,
    },
    topProducts,
    series: buildSeries(orders, period, now),
  }
}

/**
 * Classe les produits par quantite vendue sur la periode.
 *
 * Le CA est recalcule depuis `order_items.price` (le prix au moment de la vente)
 * et non depuis le prix actuel du produit : une promotion ne doit pas reecrire
 * l'historique, et `orders.total` inclut la livraison et la taxe, qui ne
 * concernent pas le classement d'un produit.
 */
async function rankProducts(
  items: OrderItemRow[],
  unitsSold: number,
  limit: number,
): Promise<TopSoldProductRow[]> {
  if (items.length === 0) return []

  const totals = new Map<string, { units: number; revenue: number }>()

  for (const item of items) {
    const entry = totals.get(item.product_id) ?? { units: 0, revenue: 0 }
    entry.units += item.quantity ?? 0
    entry.revenue += (item.quantity ?? 0) * toAmount(item.price)
    totals.set(item.product_id, entry)
  }

  const ranked = [...totals.entries()]
    .sort((a, b) => b[1].units - a[1].units || b[1].revenue - a[1].revenue)
    .slice(0, limit)

  const productIds = ranked.map(([productId]) => productId)

  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('id,slug,name,sku,brand,colorway,images')
    .in('id', productIds)

  if (error) throw new Error(`products: ${error.message}`)

  const catalogue = new Map(
    ((data ?? []) as ProductRow[]).map((row) => [row.id, row]),
  )

  return ranked.map(([productId, value], index) => {
    const product = catalogue.get(productId)

    return {
      productId,
      name: product?.name ?? '—',
      slug: product?.slug ?? '',
      sku: product?.sku ?? null,
      brand: product?.brand ?? null,
      colorway: product?.colorway ?? null,
      coverImage: product?.images?.[0] ?? null,
      unitsSold: value.units,
      revenue: value.revenue,
      share: unitsSold > 0 ? (value.units / unitsSold) * 100 : 0,
      rank: index + 1,
    }
  })
}
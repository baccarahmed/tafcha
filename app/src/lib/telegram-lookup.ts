import 'server-only'

import { getAdminUsers, type AdminUserRow } from './admin-data'
import { insforgeAdmin } from './insforge-admin'
import { parseSizes, type SizeStock } from './telegram-format'

/**
 * Resolution des references tapees dans le chat.
 *
 * L'admin ne connait pas les uuid : il tape une reference courte, un slug ou un
 * bout de nom. Ces fonctions traduisent ces saisies en lignes reelles, et
 * refusent d'agir quand plusieurs lignes correspondent — mieux vaut redemander
 * une precision que modifier le mauvais produit.
 *
 * Le SDK ne propose pas de recherche textuelle (`ilike` absent) : les
 * collections sont lues puis filtrees cote application, ce qui reste tenable a
 * l'echelle de la boutique (quelques centaines de fiches).
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Plafond de lecture : au-dela, une recherche par nom devient partielle. */
const SCAN_LIMIT = 1000

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------

const ORDER_FIELDS =
  'id,status,payment_status,payment_method,subtotal,shipping,total,notes,' +
  'shipping_address,delivery_window_start,delivery_window_end,created_at,updated_at'

export interface OrderLookup {
  id: string
  status: string | null
  paymentStatus: string | null
  paymentMethod: string | null
  subtotal: number
  shipping: number
  total: number
  notes: string | null
  shippingAddress: unknown
  deliveryWindowStart: string | null
  deliveryWindowEnd: string | null
  createdAt: string
}

function toAmount(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number.parseFloat(value) || 0

  return 0
}

function mapOrder(row: Record<string, unknown>): OrderLookup {
  return {
    id: String(row.id),
    status: (row.status as string | null) ?? null,
    paymentStatus: (row.payment_status as string | null) ?? null,
    paymentMethod: (row.payment_method as string | null) ?? null,
    subtotal: toAmount(row.subtotal),
    shipping: toAmount(row.shipping),
    total: toAmount(row.total),
    notes: (row.notes as string | null) ?? null,
    shippingAddress: row.shipping_address ?? null,
    deliveryWindowStart: (row.delivery_window_start as string | null) ?? null,
    deliveryWindowEnd: (row.delivery_window_end as string | null) ?? null,
    createdAt: String(row.created_at),
  }
}

/**
 * Retrouve une commande par uuid complet ou par reference courte.
 *
 * `orders` n'a pas de colonne `reference` : la recherche courte balaie les
 * dernieres commandes cote application plutot que d'ecrire un SQL avec cast
 * d'uuid, qui dependrait du dialecte PostgREST du deploiement.
 */
export async function findOrder(ref: string): Promise<OrderLookup | null> {
  const db = insforgeAdmin().database
  const trimmed = ref.trim()

  if (UUID_RE.test(trimmed)) {
    const { data, error } = await db
      .from('orders')
      .select(ORDER_FIELDS)
      .eq('id', trimmed.toLowerCase())
      .maybeSingle()

    if (error) throw new Error(`orders: ${error.message}`)

    return data ? mapOrder(data as unknown as Record<string, unknown>) : null
  }

  const clean = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length < 4) return null

  const { data, error } = await db
    .from('orders')
    .select(ORDER_FIELDS)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(`orders: ${error.message}`)

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const match = rows.find((row) => String(row.id).slice(0, clean.length).toUpperCase() === clean)

  return match ? mapOrder(match) : null
}

export interface OrderListRow extends OrderLookup {
  shortId: string
}

export async function listOrders(limit: number): Promise<OrderListRow[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('orders')
    .select(ORDER_FIELDS)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`orders: ${error.message}`)

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const order = mapOrder(row)

    return { ...order, shortId: order.id.slice(0, 8).toUpperCase() }
  })
}

export interface ProductLookup {
  id: string
  slug: string
  sku: string | null
  name: string
  brand: string | null
  colorway: string | null
  price: number
  comparePrice: number | null
  stock: number
  active: boolean
  featured: boolean
  isNewDrop: boolean
  parentId: string | null
  sizes: SizeStock[]
  cover: string | null
}

const PRODUCT_FIELDS =
  'id,slug,sku,name,brand,colorway,price,compare_price,stock,active,featured,' +
  'is_new_drop,parent_id,sizes,images'

function firstImage(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const first = value.find((entry) => typeof entry === 'string' && entry.trim())

  return typeof first === 'string' ? first : null
}

function mapProduct(row: Record<string, unknown>): ProductLookup {
  return {
    id: String(row.id),
    slug: String(row.slug ?? ''),
    sku: (row.sku as string | null) ?? null,
    name: String(row.name ?? ''),
    brand: (row.brand as string | null) ?? null,
    colorway: (row.colorway as string | null) ?? null,
    price: toAmount(row.price),
    comparePrice: row.compare_price === null || row.compare_price === undefined
      ? null
      : toAmount(row.compare_price),
    stock: toAmount(row.stock),
    active: row.active === true,
    featured: row.featured === true,
    isNewDrop: row.is_new_drop === true,
    parentId: (row.parent_id as string | null) ?? null,
    sizes: parseSizes(row.sizes),
    cover: firstImage(row.images),
  }
}

async function loadProducts(): Promise<ProductLookup[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select(PRODUCT_FIELDS)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) throw new Error(`products: ${error.message}`)

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapProduct)
}

/**
 * Produits correspondant a une saisie : uuid, reference courte, slug exact,
 * puis nom ou coloris. Les correspondances exactes court-circuitent la
 * recherche floue pour qu'un slug ressemblant a un autre nom ne soit jamais
 * prefere a la fiche reellement visee.
 */
export async function findProducts(query: string, limit = 8): Promise<ProductLookup[]> {
  const products = await loadProducts()
  const needle = query.trim()
  if (needle.length === 0) return []

  if (UUID_RE.test(needle)) {
    return products.filter((product) => product.id === needle.toLowerCase()).slice(0, limit)
  }

  const lower = needle.toLowerCase()
  const bySlug = products.filter((product) => product.slug.toLowerCase() === lower)
  if (bySlug.length > 0) return bySlug.slice(0, limit)

  const clean = needle.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length >= 4) {
    const byShortId = products.filter(
      (product) => product.id.slice(0, clean.length).toUpperCase() === clean,
    )
    if (byShortId.length > 0) return byShortId.slice(0, limit)
  }

  return products
    .filter(
      (product) =>
        product.name.toLowerCase().includes(lower) ||
        (product.colorway ?? '').toLowerCase().includes(lower),
    )
    .slice(0, limit)
}

export async function listLowStock(threshold: number, limit = 30): Promise<ProductLookup[]> {
  const products = await loadProducts()

  return products
    .filter((product) => product.active && product.stock <= threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, limit)
}

export async function listProducts(limit = 20): Promise<ProductLookup[]> {
  const products = await loadProducts()

  return products.slice(0, limit)
}

export interface PromotionLookup {
  id: string
  name: string
  description: string | null
  type: string
  percentage: number
  startDate: string | null
  endDate: string | null
  active: boolean
  targets: string[]
  announcementText: string | null
}

function toTargets(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed: unknown = JSON.parse(value)

      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string')
        : ['*']
    } catch {
      return ['*']
    }
  }

  return ['*']
}

async function loadPromotions(): Promise<PromotionLookup[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('promotions')
    .select(
      'id,name,description,type,percentage,start_date,end_date,active,targets,announcement_text',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(`promotions: ${error.message}`)

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    description: (row.description as string | null) ?? null,
    type: (row.type as string | null) ?? 'PRODUCT',
    percentage: toAmount(row.percentage),
    startDate: (row.start_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
    active: row.active === true,
    targets: toTargets(row.targets),
    announcementText: (row.announcement_text as string | null) ?? null,
  }))
}

export async function listPromotions(): Promise<PromotionLookup[]> {
  return loadPromotions()
}

/** Promotions par uuid, reference courte ou nom. */
export async function findPromotions(query: string, limit = 5): Promise<PromotionLookup[]> {
  const promotions = await loadPromotions()
  const needle = query.trim()
  if (needle.length === 0) return []

  if (UUID_RE.test(needle)) {
    return promotions.filter((promotion) => promotion.id === needle.toLowerCase()).slice(0, limit)
  }

  const clean = needle.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length >= 4) {
    const byShortId = promotions.filter(
      (promotion) => promotion.id.slice(0, clean.length).toUpperCase() === clean,
    )
    if (byShortId.length > 0) return byShortId.slice(0, limit)
  }

  return promotions
    .filter((promotion) => promotion.name.toLowerCase().includes(needle.toLowerCase()))
    .slice(0, limit)
}

export async function listCustomers(query: string, limit = 10): Promise<AdminUserRow[]> {
  const users = await getAdminUsers()
  const needle = query.trim().toLowerCase()

  return users
    .filter((user) => {
      if (needle.length === 0) return true

      return (
        user.email.toLowerCase().includes(needle) ||
        user.name.toLowerCase().includes(needle)
      )
    })
    .slice(0, limit)
}

/** Client par e-mail exact (insensible a la casse), pour promote/demote. */
export async function findCustomerByEmail(email: string): Promise<AdminUserRow | null> {
  const users = await getAdminUsers()
  const needle = email.trim().toLowerCase()

  return users.find((user) => user.email.trim().toLowerCase() === needle) ?? null
}

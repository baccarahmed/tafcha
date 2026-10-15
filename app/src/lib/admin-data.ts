import 'server-only'

import { insforgeAdmin } from '@/lib/insforge-admin'
import { isCountedSale } from '@/lib/admin-analytics'
import type { ProductGender, SneakerPalette } from '@/types/product'

/**
 * Lecture des donnees reelles du back-office.
 *
 * Tout passe par le client admin : ces pages sont derriere le garde de
 * dashboard/layout.tsx, qui verifie role = 'ADMIN' en base avant tout rendu.
 *
 * Les noms de colonnes suivent exactement le schema public : orders n'a pas de
 * reference, promotions n'a ni code ni used_count, products se pilote avec
 * active et non is_published.
 */

export interface AdminUserRow {
  id: string
  email: string
  name: string
  firstName: string | null
  lastName: string | null
  role: 'CUSTOMER' | 'ADMIN'
  createdAt: string
  orders: number
  spent: number
}

interface ProfileRow {
  user_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: 'CUSTOMER' | 'ADMIN'
  created_at: string
}

interface OrderRow {
  id: string
  user_id: string | null
  status: string | null
  payment_status: string | null
  payment_method: string | null
  subtotal: number | null
  shipping: number | null
  total: number | null
  shipping_address: unknown
  created_at: string
}

/**
 * E-mail d'une commande invitee.
 *
 * Sans compte, `user_id` est NULL et il n'y a pas de ligne `profiles` a
 * joindre : l'e-mail saisi au checkout est le seul contact, conserve dans
 * `shipping_address`.
 */
function guestEmail(address: unknown): string | null {
  if (address && typeof address === 'object' && 'email' in address) {
    const email = (address as { email?: unknown }).email
    if (typeof email === 'string' && email.trim()) return email.trim()
  }
  return null
}

/** Cle jour locale (AAAA-MM-JJ) : `toISOString()` decalerait d'un jour en UTC+1. */
function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Resolution des adresses : profiles.email est le miroir de auth.users. */
async function emailByUserId(userIds: Array<string | null>): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  const map = new Map<string, string>()
  if (ids.length === 0) return map

  const { data, error } = await insforgeAdmin()
    .database.from('profiles')
    .select('user_id,email')
    .in('user_id', ids)

  if (error) throw new Error(`profiles: ${error.message}`)

  for (const row of (data ?? []) as Array<{ user_id: string; email: string | null }>) {
    if (row.email) map.set(row.user_id, row.email)
  }
  return map
}

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const db = insforgeAdmin().database

  const [{ data: profiles, error: profilesError }, { data: orders, error: ordersError }] =
    await Promise.all([
      db
        .from('profiles')
        .select('user_id,email,first_name,last_name,role,created_at')
        .order('created_at', { ascending: false }),
      db.from('orders').select('user_id,status,payment_status,total'),
    ])

  if (profilesError) throw new Error(`profiles: ${profilesError.message}`)
  if (ordersError) throw new Error(`orders: ${ordersError.message}`)

  const stats = new Map<string, { count: number; total: number }>()
  for (const order of (orders ?? []) as Array<{
    user_id: string | null
    status: string | null
    payment_status: string | null
    total: number | null
  }>) {
    if (!order.user_id) continue
    // Meme regle que l'analytique : une commande annulee, non payee ou
    // remboursee ne doit pas grossir le panier d'un client.
    if (!isCountedSale(order.status, order.payment_status)) continue
    const entry = stats.get(order.user_id) ?? { count: 0, total: 0 }
    entry.count += 1
    entry.total += order.total ?? 0
    stats.set(order.user_id, entry)
  }

  return ((profiles ?? []) as ProfileRow[]).map((profile) => {
    const userStats = stats.get(profile.user_id)
    return {
      id: profile.user_id,
      email: profile.email ?? '',
      name: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role,
      createdAt: profile.created_at,
      orders: userStats?.count ?? 0,
      spent: userStats?.total ?? 0,
    }
  })
}

export interface AdminOrderRow {
  id: string
  shortId: string
  userId: string | null
  customerEmail: string | null
  status: string | null
  paymentStatus: string | null
  paymentMethod: string | null
  subtotal: number
  shipping: number
  total: number
  createdAt: string
  items: AdminOrderItem[]
}

export interface AdminOrderItem {
  id: string
  name: string
  colorway: string | null
  quantity: number
  price: number
}

export async function getAdminOrders(): Promise<AdminOrderRow[]> {
  return toOrderRows(await readOrderHeaders())
}

/** Les `limit` dernieres commandes, lignes et e-mails compris. */
export async function getRecentOrders(limit = 5): Promise<AdminOrderRow[]> {
  return toOrderRows(await readOrderHeaders(limit))
}

async function toOrderRows(rows: OrderRow[]): Promise<AdminOrderRow[]> {
  const [emails, itemsByOrder] = await Promise.all([
    emailByUserId(rows.map((row) => row.user_id)),
    loadOrderLines(rows.map((row) => row.id)),
  ])

  return rows.map((row) => ({
    id: row.id,
    shortId: row.id.slice(0, 8).toUpperCase(),
    userId: row.user_id,
    customerEmail: row.user_id ? (emails.get(row.user_id) ?? null) : guestEmail(row.shipping_address),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    subtotal: row.subtotal ?? 0,
    shipping: row.shipping ?? 0,
    total: row.total ?? 0,
    createdAt: row.created_at,
    items: itemsByOrder.get(row.id) ?? [],
  }))
}

/**
 * En-tetes de commande seuls.
 *
 * Separe de `getAdminOrders()` car le tableau de bord n'affiche que les cinq
 * dernieres commandes : charger leurs lignes pour un resume serait du travail
 * inutile a chaque rechargement.
 */
async function readOrderHeaders(limit?: number): Promise<OrderRow[]> {
  let query = insforgeAdmin()
    .database
    .from('orders')
    .select(
      'id,user_id,status,payment_status,payment_method,subtotal,shipping,total,shipping_address,created_at',
    )
    .order('created_at', { ascending: false })

  if (limit !== undefined) query = query.limit(limit)

  const { data, error } = await query

  if (error) throw new Error(`orders: ${error.message}`)

  return (data ?? []) as OrderRow[]
}

/**
 * Lignes de commande groupees par commande, avec le nom et le colorway
 * resolus au passage.
 *
 * Une seule lecture des lignes pour toutes les commandes affichees : les
 * charger ligne par ligne ferait autant d'appels que de commandes, ce qui est
 * le principal cout de la page des commandes.
 */
async function loadOrderLines(
  orderIds: string[],
): Promise<Map<string, AdminOrderItem[]>> {
  const grouped = new Map<string, AdminOrderItem[]>()

  if (orderIds.length === 0) return grouped

  const db = insforgeAdmin().database

  const { data, error } = await db
    .from('order_items')
    .select('id,order_id,product_id,quantity,price')
    .in('order_id', orderIds)

  if (error) throw new Error(`order_items: ${error.message}`)

  const rows = (data ?? []) as Array<{
    id: string
    order_id: string
    product_id: string
    quantity: number
    price: number | string | null
  }>

  if (rows.length === 0) return grouped

  const { data: catalogue, error: catalogueError } = await db
    .from('products')
    .select('id,name,colorway')
    .in(
      'id',
      [...new Set(rows.map((row) => row.product_id))],
    )

  if (catalogueError) throw new Error(`products: ${catalogueError.message}`)

  const products = new Map(
    ((catalogue ?? []) as Array<{
      id: string
      name: string | null
      colorway: string | null
    }>).map((product) => [product.id, product]),
  )

  for (const row of rows) {
    const product = products.get(row.product_id)

    const line: AdminOrderItem = {
      id: row.id,
      name: product?.name ?? '—',
      colorway: product?.colorway ?? null,
      quantity: row.quantity ?? 0,
      price: typeof row.price === 'string' ? Number.parseFloat(row.price) : row.price ?? 0,
    }

    const bucket = grouped.get(row.order_id) ?? []
    bucket.push(line)
    grouped.set(row.order_id, bucket)
  }

  return grouped
}

export interface AdminPromotionRow {
  id: string
  name: string
  description: string | null
  type: string | null
  percentage: number | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  /**
   * Cibles et texte d'annonce sont relus avec le reste.
   *
   * Sans ces deux colonnes, le formulaire de modification ne pourrait pas les
   * pre-remplir et son enregistrement les reecrirait a son insu : une promotion
   * ciblee sur trois produits deviendrait globale du simple fait qu'on lui a
   * change son nom.
   */
  targets: string[]
  announcementText: string | null
}

export async function getAdminPromotions(): Promise<AdminPromotionRow[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('promotions')
    .select(
      'id,name,description,type,percentage,start_date,end_date,active,targets,announcement_text',
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(`promotions: ${error.message}`)

  return ((data ?? []) as Array<{
    id: string
    name: string
    description: string | null
    type: string | null
    percentage: number | null
    start_date: string | null
    end_date: string | null
    active: boolean
    targets: string[] | string | null
    announcement_text: string | null
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    percentage: row.percentage,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.active,
    targets: toTargets(row.targets),
    announcementText: row.announcement_text,
  }))
}

/** `targets` est un tableau JSON ; on tolere aussi une chaine pour les lignes d'archive. */
function toTargets(value: string[] | string | null): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : ['*']
    } catch {
      return ['*']
    }
  }
  return ['*']
}

export interface PromotionTargetOption {
  id: string
  name: string
}

export interface PromotionTargetOptions {
  products: PromotionTargetOption[]
  categories: PromotionTargetOption[]
}

/**
 * Cibles possibles d'une promotion, pour le selecteur du back-office.
 *
 * `targets` stocke des identifiants : `products.id` quand le type vaut
 * PRODUCT, `categories.id` quand il vaut CATEGORY. La vitrine applique la
 * remise avec la meme convention, donc les deux listes doivent venir des tables
 * reelles et non d'un slug recompose.
 */
export async function getPromotionTargetOptions(): Promise<PromotionTargetOptions> {
  const db = insforgeAdmin().database

  const [{ data: products, error: productsError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      db.from('products').select('id,name').order('name', { ascending: true }),
      db.from('categories').select('id,name').order('name', { ascending: true }),
    ])

  if (productsError) throw new Error(`products: ${productsError.message}`)
  if (categoriesError) throw new Error(`categories: ${categoriesError.message}`)

  return {
    products: (products ?? []) as PromotionTargetOption[],
    categories: (categories ?? []) as PromotionTargetOption[],
  }
}

export interface AdminProductRow {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  stock: number
  isActive: boolean
  isNewDrop: boolean
  createdAt: string
  releaseDate: string | null
  dropEndsAt: string | null
}

export async function getAdminProducts(): Promise<AdminProductRow[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('id,slug,name,brand,price,stock,active,is_new_drop,created_at,release_date,drop_ends_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`products: ${error.message}`)

  return ((data ?? []) as Array<{
    id: string
    slug: string
    name: string
    brand: string
    price: number
    stock: number
    active: boolean
    is_new_drop: boolean
    created_at: string
    release_date: string | null
    drop_ends_at: string | null
  }>).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    price: row.price,
    stock: row.stock,
    isActive: row.active,
    isNewDrop: row.is_new_drop,
    createdAt: row.created_at,
    releaseDate: row.release_date,
    dropEndsAt: row.drop_ends_at,
  }))
}

/**
 * Fiche produit complete pour le back-office, produits inactifs compris.
 *
 * `getAdminProducts()` ne lit que les colonnes d'une ligne de tableau et sert
 * aux pages de synthese. L'edition a besoin de la totalite des champs, sinon
 * le formulaire de modification ne pourrait pas pre-remplir ce qu'il ne voit
 * pas. Contrairement a `getProducts()`, aucun filtre sur `active` : un produit
 * depose doit rester visible et reactivable depuis le back-office.
 */
export interface AdminEditableProduct {
  id: string
  name: string
  slug: string
  sku: string | null
  brand: string | null
  description: string | null
  colorway: string | null
  images: string[]
  price: number
  comparePrice: number | null
  categoryId: string | null
  gender: ProductGender
  palette: SneakerPalette
  sizes: { size: number; stock: number }[]
  featured: boolean
  active: boolean
  isNewDrop: boolean
  releaseDate: string | null
  dropEndsAt: string | null
  /** Modele parent : null pour la fiche de reference, renseigne pour un coloris. */
  parentId: string | null
}

const PALETTES: SneakerPalette[] = ['crimson', 'ember', 'void', 'volt', 'onyx']
const GENDERS: ProductGender[] = ['homme', 'femme', 'enfant', 'unisexe']

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value
  return Number.isFinite(parsed) ? (parsed as number) : 0
}

export async function getAdminEditableProducts(): Promise<AdminEditableProduct[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select(
      'id,name,slug,sku,brand,description,colorway,images,price,compare_price,' +
        'category_id,gender,palette,sizes,featured,active,is_new_drop,release_date,drop_ends_at,parent_id'
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(`products: ${error.message}`)

  return ((data ?? []) as unknown as Array<{
    id: string
    name: string
    slug: string
    sku: string | null
    brand: string | null
    description: string | null
    colorway: string | null
    images: string[] | null
    price: number | string
    compare_price: number | string | null
    category_id: string | null
    gender: string | null
    palette: string | null
    sizes: { size: number | string; stock: number }[] | null
    featured: boolean
    active: boolean
    is_new_drop: boolean
    release_date: string | null
    drop_ends_at: string | null
    parent_id: string | null
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brand: row.brand,
    description: row.description,
    colorway: row.colorway,
    images: row.images ?? [],
    price: toNumber(row.price),
    comparePrice: row.compare_price === null ? null : toNumber(row.compare_price),
    categoryId: row.category_id,
    gender: GENDERS.includes(row.gender as ProductGender)
      ? (row.gender as ProductGender)
      : 'unisexe',
    palette: PALETTES.includes(row.palette as SneakerPalette)
      ? (row.palette as SneakerPalette)
      : 'onyx',
    sizes: (row.sizes ?? []).map((size) => ({
      size: toNumber(size.size),
      stock: toNumber(size.stock),
    })),
    featured: row.featured,
    active: row.active,
    isNewDrop: row.is_new_drop,
    releaseDate: row.release_date,
    dropEndsAt: row.drop_ends_at,
    parentId: row.parent_id,
  }))
}

export interface AdminOverview {
  revenue: number
  orderCount: number
  customerCount: number
  adminCount: number
  productCount: number
  lowStock: number
  activeProducts: number
  revenueSeries: Array<{ label: string; value: number }>
  statusCounts: Record<string, number>
  recentOrders: AdminOrderRow[]
  recentUsers: AdminUserRow[]
}

/**
 * Calcule les indicateurs du dashboard a partir des tables reelles.
 *
 * Le serie de revenus est derivee des commandes groupees par jour sur 14 jours :
 * elle suit donc l'activite, au lieu d'une courbe statique.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const db = insforgeAdmin().database

  const [
    { data: orders, error: ordersError },
    { data: products, error: productsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    db.from('orders')
      .select('id,user_id,status,payment_status,total,created_at')
      .order('created_at', { ascending: false }),
    db.from('products').select('id,stock,active'),
    db.from('profiles').select('user_id,role'),
  ])

  if (ordersError) throw new Error(`orders: ${ordersError.message}`)
  if (productsError) throw new Error(`products: ${productsError.message}`)
  if (profilesError) throw new Error(`profiles: ${profilesError.message}`)

  const orderRows = (orders ?? []) as OrderRow[]
  const productRows = (products ?? []) as Array<{ id: string; stock: number; active: boolean }>
  const profileRows = (profiles ?? []) as Array<{ user_id: string; role: string }>

  const revenue = orderRows.reduce(
    (sum, order) =>
      isCountedSale(order.status, order.payment_status) ? sum + (order.total ?? 0) : sum,
    0,
  )

  const statusCounts: Record<string, number> = {}
  for (const order of orderRows) {
    const key = order.status ?? 'UNKNOWN'
    statusCounts[key] = (statusCounts[key] ?? 0) + 1
  }

  // Serie sur 14 jours, du plus ancien au plus récent.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets = new Map<string, number>()
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(today)
    day.setDate(day.getDate() - i)
    buckets.set(localDayKey(day), 0)
  }
  for (const order of orderRows) {
    if (!isCountedSale(order.status, order.payment_status)) continue
    const key = localDayKey(new Date(order.created_at))
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + (order.total ?? 0))
  }

  const [recentOrders, recentUsers] = await Promise.all([getRecentOrders(5), getAdminUsers()])

  return {
    revenue,
    orderCount: orderRows.length,
    customerCount: profileRows.filter((p) => p.role === 'CUSTOMER').length,
    adminCount: profileRows.filter((p) => p.role === 'ADMIN').length,
    productCount: productRows.length,
    lowStock: productRows.filter((p) => p.stock > 0 && p.stock <= 5).length,
    activeProducts: productRows.filter((p) => p.active).length,
    revenueSeries: [...buckets.entries()].map(([key, value]) => ({
      label: key.slice(5),
      value,
    })),
    statusCounts,
    recentOrders: recentOrders.slice(0, 5),
    recentUsers: recentUsers.slice(0, 5),
  }
}

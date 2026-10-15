import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'

import { insforgeAdmin } from './insforge-admin'
import { CATALOG_TAGS } from './cache-tags'
import {
  applyPercentage,
  getActivePromotions,
  resolveDiscountPercentage,
  type ActivePromotion,
} from './promotions'
import type { SneakerPalette, ProductGender, ProductVariant } from '@/types/product'
import type { CatalogProduct, DbCategory, SiteSettings } from '@/types/catalog'

export type SneakerProduct = CatalogProduct
export type { DbCategory, SiteSettings }

interface ProductRow {
  id: string
  name: string
  slug: string
  sku: string | null
  brand: string | null
  description: string | null
  colorway: string | null
  palette: string
  hover_palette: string | null
  price: number | string
  compare_price: number | string | null
  stock: number
  sizes: { size: number | string; stock: number }[] | null
  images: string[] | null
  featured: boolean
  active: boolean
  gender: ProductGender | null
  category_id: string | null
  parent_id: string | null
  release_date: string | null
  is_new_drop: boolean
  drop_ends_at: string | null
  created_at: string
  categories: { slug: string; name: string } | null
}

const PRODUCT_COLUMNS =
  'id, name, slug, sku, brand, description, colorway, palette, hover_palette, price, compare_price, stock, sizes, images, featured, active, gender, category_id, parent_id, release_date, is_new_drop, drop_ends_at, created_at, categories(slug, name)'

const PALETTES: SneakerPalette[] = ['crimson', 'ember', 'void', 'volt', 'onyx']

const toPalette = (value: string | null | undefined): SneakerPalette =>
  PALETTES.includes(value as SneakerPalette) ? (value as SneakerPalette) : 'onyx'

const toNumber = (value: number | string | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value)

/** Maps a database row onto the shape the storefront components consume. */
function toProduct(row: ProductRow): SneakerProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? 'Q2M',
    price: toNumber(row.price),
    comparePrice: row.compare_price === null ? undefined : toNumber(row.compare_price),
    palette: toPalette(row.palette),
    hoverPalette: row.hover_palette ? toPalette(row.hover_palette) : undefined,
    colorway: row.colorway ?? 'Standard',
    sku: row.sku,
    images: row.images ?? [],
    sizes: (row.sizes ?? []).map((s) => ({ size: s.size, stock: s.stock })),
    featured: row.featured,
    gender: row.gender ?? null,
    categoryId: row.category_id ?? null,
    releaseDate: row.release_date ?? undefined,
    isNewDrop: row.is_new_drop,
    isSoldOut: !row.active || toNumber(row.stock) === 0,
    categorySlug: row.categories?.slug,
    dropEndsAt: row.drop_ends_at ?? undefined,
    parentId: row.parent_id ?? null,
  }
}

const asRows = (data: unknown): ProductRow[] => (data ?? []) as ProductRow[]

/**
 * Applique aux promotions actives le prix affiche par la vitrine.
 *
 * Le prix de base devient le prix remise et repasse en prix barré (`comparePrice`),
 * ce qui donne au client la valeur depart sans modifier la table `products` : les
 * promotions ne sont qu'une vue temporelle. `discountPercentage` permet aux
 * composants d'afficher le badge « -X % ».
 */
function withPromotion(product: SneakerProduct, promotions: ActivePromotion[]): SneakerProduct {
  const percentage = resolveDiscountPercentage(product, promotions)
  if (percentage <= 0) return product

  const original = product.price
  const discounted = applyPercentage(original, percentage)
  if (discounted >= original) return product

  return {
    ...product,
    price: discounted,
    comparePrice: Math.max(product.comparePrice ?? 0, original),
    discountPercentage: percentage,
  }
}

const withPromotions = (products: SneakerProduct[], promotions: ActivePromotion[]): SneakerProduct[] =>
  products.map((product) => withPromotion(product, promotions))

export const toVariant = (product: SneakerProduct): ProductVariant => ({
  id: product.id,
  slug: product.slug,
  colorway: product.colorway,
  palette: product.palette,
  image: product.images[0],
  price: product.price,
  isSoldOut: Boolean(product.isSoldOut),
})

/**
 * Regroupe les fiches en modeles : une carte par modele, quel que soit le
 * nombre de coloris. La fiche de reference (`parentId` null) sert de visuel
 * quand elle a une photo ; sinon on prend le premier coloris qui en a une, pour
 * qu'une carte ne retombe pas sur le visuel procedural alors qu'un coloris est
 * photographie.
 */
export function groupByModel(products: SneakerProduct[]): SneakerProduct[] {
  const groups = new Map<string, SneakerProduct[]>()

  for (const product of products) {
    const root = product.parentId ?? product.id
    const bucket = groups.get(root)
    if (bucket) bucket.push(product)
    else groups.set(root, [product])
  }

  return [...groups.values()].map((group) => {
    const parent = group.find((item) => item.parentId === null)
    const representative =
      (parent && parent.images.length > 0 ? parent : undefined) ??
      group.find((item) => item.images.length > 0) ??
      parent ??
      group[0]

    return {
      ...representative,
      variants: group.map(toVariant),
    }
  })
}

async function loadProducts(): Promise<SneakerProduct[]> {
  const [rows, promotions] = await Promise.all([
    insforgeAdmin()
      .database.from('products')
      .select(PRODUCT_COLUMNS)
      .eq('active', true)
      .order('created_at', { ascending: false }),
    getActivePromotions(),
  ])
  const { data, error } = rows

  if (error) throw new Error(`Failed to load products: ${error.message}`)
  return groupByModel(withPromotions(asRows(data).map(toProduct), promotions))
}

/**
 * Catalogue complet, groupe par modele.
 *
 * Deux niveaux de cache : `cache` dedoublonne les appels d'un meme rendu (le
 * layout et la page partagent une seule requete), `unstable_cache` sert les
 * navigations suivantes depuis le Data Cache. Toute ecriture back-office purge
 * via `revalidateTag` (cf. `lib/revalidate-catalog.ts`).
 */
export const getProducts = cache(
  unstable_cache(loadProducts, ['catalog-products'], {
    tags: [CATALOG_TAGS.products],
    revalidate: 300,
  })
)

async function loadFeaturedProducts(limit = 4): Promise<SneakerProduct[]> {
  const [rows, promotions] = await Promise.all([
    insforgeAdmin()
      .database.from('products')
      .select(PRODUCT_COLUMNS)
      .eq('active', true)
      .eq('featured', true)
      .order('created_at', { ascending: false }),
    getActivePromotions(),
  ])
  const { data, error } = rows

  if (error) throw new Error(`Failed to load featured products: ${error.message}`)
  return groupByModel(withPromotions(asRows(data).map(toProduct), promotions)).slice(0, limit)
}

export const getFeaturedProducts = cache(
  unstable_cache(loadFeaturedProducts, ['catalog-featured'], {
    tags: [CATALOG_TAGS.products],
    revalidate: 300,
  })
)

async function loadDrops(limit = 4): Promise<SneakerProduct[]> {
  const [rows, promotions] = await Promise.all([
    insforgeAdmin()
      .database.from('products')
      .select(PRODUCT_COLUMNS)
      .eq('is_new_drop', true)
      .eq('active', true)
      .order('drop_ends_at', { ascending: true }),
    getActivePromotions(),
  ])
  const { data, error } = rows

  if (error) throw new Error(`Failed to load drops: ${error.message}`)
  return groupByModel(withPromotions(asRows(data).map(toProduct), promotions)).slice(0, limit)
}

export const getDrops = cache(
  unstable_cache(loadDrops, ['catalog-drops'], {
    tags: [CATALOG_TAGS.products],
    revalidate: 300,
  })
)

/**
 * Charge une fiche et les coloris de son modele. Le modele est identifie par la
 * fiche de reference (`parent_id` null) : que l'on ouvre la reference ou l'un de
 * ses coloris, on retombe sur le meme ensemble de variantes.
 */
async function loadVariants(
  product: SneakerProduct,
  promotions: ActivePromotion[]
): Promise<ProductVariant[]> {
  const rootId = product.parentId ?? product.id

  const [children, root] = await Promise.all([
    insforgeAdmin()
      .database.from('products')
      .select('id, slug, colorway, palette, price, stock, active, images, parent_id')
      .eq('parent_id', rootId)
      .eq('active', true),
    insforgeAdmin()
      .database.from('products')
      .select('id, slug, colorway, palette, price, stock, active, images, parent_id')
      .eq('id', rootId)
      .eq('active', true)
      .maybeSingle(),
  ])

  const rows: ProductRow[] = []

  if (root.error === null && root.data) rows.push(root.data as unknown as ProductRow)
  if (children.error === null) rows.push(...((children.data ?? []) as unknown as ProductRow[]))

  const seen = new Set<string>()

  return rows
    .filter((row) => (seen.has(row.id) ? false : seen.add(row.id)))
    .map((row) => toVariant(withPromotion(toProduct(row), promotions)))
}

async function loadProductBySlug(slug: string): Promise<SneakerProduct | null> {
  const [rows, promotions] = await Promise.all([
    insforgeAdmin()
      .database.from('products')
      .select(PRODUCT_COLUMNS)
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle(),
    getActivePromotions(),
  ])
  const { data, error } = rows

  if (error) throw new Error(`Failed to load product: ${error.message}`)
  if (!data) return null
  // The SDK types embedded many-to-one relations as arrays, but the API returns an object.
  const product = withPromotion(toProduct(data as unknown as ProductRow), promotions)

  return { ...product, variants: await loadVariants(product, promotions) }
}

/**
 * Une fiche produit et ses coloris, memoisée par slug.
 *
 * `generateMetadata` et la page appellent tous deux `getProductBySlug(slug)` :
 * `cache` les fait converger vers une seule requete et `unstable_cache` evite de
 * la rejouer a chaque navigation.
 */
export const getProductBySlug = cache(
  unstable_cache(loadProductBySlug, ['catalog-product'], {
    tags: [CATALOG_TAGS.products],
    revalidate: 300,
  })
)

/**
 * Tous les slugs actifs, coloris compris. Le sitemap doit lister chaque page
 * produit : le regroupement en modeles de `getProducts()` masquerait les
 * coloris, qui restent pourtant des pages indexables.
 */
export async function getAllProductSlugs(): Promise<string[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('slug')
    .eq('active', true)

  if (error) throw new Error(`Failed to load product slugs: ${error.message}`)

  return ((data ?? []) as unknown as { slug: string }[]).map((row) => row.slug)
}

async function loadCategories(): Promise<DbCategory[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('categories')
    .select('*')
    .order('position', { ascending: true })

  if (error) throw new Error(`Failed to load categories: ${error.message}`)
  return (data ?? []) as DbCategory[]
}

export const getCategories = cache(
  unstable_cache(loadCategories, ['catalog-categories'], {
    tags: [CATALOG_TAGS.products],
    revalidate: 300,
  })
)

async function loadSiteSettings(): Promise<SiteSettings | null> {
  const { data, error } = await insforgeAdmin()
    .database.from('site_settings')
    .select('*')
    .eq('id', 'main')
    .maybeSingle()

  if (error) throw new Error(`Failed to load site settings: ${error.message}`)
  return (data as SiteSettings) ?? null
}

export const getSiteSettings = cache(
  unstable_cache(loadSiteSettings, ['catalog-site-settings'], {
    tags: [CATALOG_TAGS.settings],
    revalidate: 300,
  })
)

/**
 * Genres effectivement presents au catalogue, pour la navigation.
 *
 * Le layout vitrine n'a besoin que de cette liste : charger tout le catalogue
 * (colonnes, promotions, regroupement en modeles) a chaque page etait le plus
 * gros cout de navigation. Une seule colonne suffit.
 */
async function loadGenders(): Promise<ProductGender[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('gender')
    .eq('active', true)

  if (error) throw new Error(`Failed to load product genders: ${error.message}`)

  const genders = new Set<ProductGender>()

  for (const row of (data ?? []) as unknown as { gender: ProductGender | null }[]) {
    if (row.gender) genders.add(row.gender)
  }

  return [...genders]
}

export const getGenders = cache(
  unstable_cache(loadGenders, ['catalog-genders'], {
    tags: [CATALOG_TAGS.products],
    revalidate: 300,
  })
)

/**
 * L'INSERT est reserve au client project_admin (insforgeAdmin) : les droits
 * anon/authenticated sur ces deux tables ont ete revoques (F-SPAM-1). Le
 * rate-limit applicatif reste en amont dans les route handlers /api/contact
 * et /api/newsletter.
 */
export async function submitContactMessage(payload: {
  name: string
  email: string
  subject?: string
  message: string
}): Promise<void> {
  const { error } = await insforgeAdmin()
    .database.from('contact_messages')
    .insert([payload])
  if (error) throw new Error(`Failed to send message: ${error.message}`)
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  const { error } = await insforgeAdmin()
    .database.from('newsletter_subscribers')
    .insert([{ email }])

  // `email` porte une contrainte unique : une double inscription est
  // un succes idempotent, pas une erreur. Le visiteire qui valide
  // deux fois le formulaire ne doit pas voir un echec.
  if (error && !isUniqueViolation(error)) {
    throw new Error(`Failed to subscribe: ${error.message}`)
  }
}

/**
 * L'API renvoie le code SQL de la contrainte (23505) ou son libelle
 * selon le pilote : on couvre les deux pour rester robuste.
 */
function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code
  const message = (error as { message?: unknown } | null)?.message

  return (
    code === '23505' ||
    (typeof message === 'string' &&
      /duplicate key value violates unique constraint/i.test(message))
  )
}
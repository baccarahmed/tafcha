import 'server-only'

import { insforge } from './insforge'
import { insforgeAdmin } from './insforge-admin'
import type { SneakerPalette, ProductGender } from '@/types/product'
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
  release_date: string | null
  is_new_drop: boolean
  drop_ends_at: string | null
  created_at: string
  categories: { slug: string; name: string } | null
}

const PRODUCT_COLUMNS =
  'id, name, slug, sku, brand, description, colorway, palette, hover_palette, price, compare_price, stock, sizes, images, featured, active, gender, category_id, release_date, is_new_drop, drop_ends_at, created_at, categories(slug, name)'

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
  }
}

const asRows = (data: unknown): ProductRow[] => (data ?? []) as ProductRow[]

export async function getProducts(): Promise<SneakerProduct[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select(PRODUCT_COLUMNS)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load products: ${error.message}`)
  return asRows(data).map(toProduct)
}

export async function getFeaturedProducts(limit = 4): Promise<SneakerProduct[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select(PRODUCT_COLUMNS)
    .eq('active', true)
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to load featured products: ${error.message}`)
  return asRows(data).map(toProduct)
}

export async function getDrops(limit = 4): Promise<SneakerProduct[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select(PRODUCT_COLUMNS)
    .eq('is_new_drop', true)
    .eq('active', true)
    .order('drop_ends_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Failed to load drops: ${error.message}`)
  return asRows(data).map(toProduct)
}

export async function getProductBySlug(slug: string): Promise<SneakerProduct | null> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select(PRODUCT_COLUMNS)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (error) throw new Error(`Failed to load product: ${error.message}`)
  // The SDK types embedded many-to-one relations as arrays, but the API returns an object.
  return data ? toProduct(data as unknown as ProductRow) : null
}

export async function getCategories(): Promise<DbCategory[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('categories')
    .select('*')
    .order('position', { ascending: true })

  if (error) throw new Error(`Failed to load categories: ${error.message}`)
  return (data ?? []) as DbCategory[]
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const { data, error } = await insforgeAdmin()
    .database.from('site_settings')
    .select('*')
    .eq('id', 'main')
    .maybeSingle()

  if (error) throw new Error(`Failed to load site settings: ${error.message}`)
  return (data as SiteSettings) ?? null
}

/** RLS allows anon inserts on these two tables; the browser client is enough. */
export async function submitContactMessage(payload: {
  name: string
  email: string
  subject?: string
  message: string
}): Promise<void> {
  const { error } = await insforge.database.from('contact_messages').insert([payload])
  if (error) throw new Error(`Failed to send message: ${error.message}`)
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  const { error } = await insforge.database
    .from('newsletter_subscribers')
    .insert([{ email }])
  if (error) throw new Error(`Failed to subscribe: ${error.message}`)
}
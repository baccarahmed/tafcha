import 'server-only'

import { insforgeAdmin } from '@/lib/insforge-admin'
import { deleteProductImages } from '@/lib/admin-storage'
import { MAX_PRODUCT_IMAGES, slugify } from '@/lib/utils'
import type { SneakerPalette, ProductGender } from '@/types/product'

/**
 * Ecriture produit depuis le back-office.
 *
 * Le client public ne dispose pas des droits d'ecriture sur `products` : seule
 * cette couche, appelee par une server action qui reverifie le role, ecrit.
 */

export const PALETTE_OPTIONS: SneakerPalette[] = [
  'crimson',
  'ember',
  'void',
  'volt',
  'onyx',
]

export const GENDER_OPTIONS: ProductGender[] = [
  'homme',
  'femme',
  'enfant',
  'unisexe',
]

export interface ProductInput {
  name: string
  slug: string
  sku: string
  brand: string
  description: string
  colorway: string
  /** Visuels du produit : la photo de couverture est la premiere. */
  images: string[]
  price: number
  comparePrice: number | null
  categoryId: string | null
  gender: ProductGender
  palette: SneakerPalette
  sizes: {
    size: number
    stock: number
  }[]
  featured: boolean
  active: boolean
  isNewDrop: boolean
  /** Modele parent : renseigne pour un coloris, absent pour la fiche de reference. */
  parentId?: string | null
  /** Date de lancement (drop à venir) : `YYYY-MM-DD` ou null. */
  releaseDate?: string | null
  /** Fin des ventes (drop en cours) : `YYYY-MM-DD` ou null. */
  dropEndsAt?: string | null
}

/** Messages en francais : le back-office est monolingue cote validation. */
export class ProductValidationError extends Error {
  constructor(public readonly field: string) {
    super(field)
    this.name = 'ProductValidationError'
  }
}

/**
 * Date ISO ramenee a `YYYY-MM-DD`, ou null pour effacer la colonne.
 *
 * Le storefront construit ses statuts/pousseurs a partir de ces deux bornes :
 * une valeur invalide se propagerait comme « drop live » indefiniment, donc on
 * refuse plutot que d'avaler.
 */
function normalizeDate(value: string | null): string | null {
  if (value === null || value.trim() === '') return null

  const trimmed = value.trim()
  // Les champs date du back-office envoient `YYYY-MM-DD` : sans heure, le
  // suffixe brut `Z` donne une date invalide. On precise donc minuit UTC.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) throw new ProductValidationError('date')

  return date.toISOString().slice(0, 10)
}

/** Au moins une pointure en stock, sinon la fiche est invisible. */
function validateSizes(sizes: ProductInput['sizes']): void {
  if (sizes.length === 0) throw new ProductValidationError('sizes')
  if (sizes.some((s) => !Number.isInteger(s.size) || s.size < 1))
    throw new ProductValidationError('sizes')
  if (sizes.some((s) => !Number.isInteger(s.stock) || s.stock < 0))
    throw new ProductValidationError('sizes')
  if (new Set(sizes.map((s) => s.size)).size !== sizes.length)
    throw new ProductValidationError('sizes')
}

/**
 * Le stock global est derive du detail des pointures cote serveur : le
 * back-office et la fiche produit ne doivent jamais afficher deux etats
 * contradictoires, et le navigateur n'est pas juge de confiance sur ce total.
 */
function totalStock(sizes: ProductInput['sizes']): number {
  return sizes.reduce((sum, size) => sum + size.stock, 0)
}

export function validateProduct(input: ProductInput): void {
  if (input.name.trim().length < 2) throw new ProductValidationError('name')
  if (!Number.isFinite(input.price) || input.price <= 0)
    throw new ProductValidationError('price')
  if (
    input.comparePrice !== null &&
    (!Number.isFinite(input.comparePrice) || input.comparePrice <= input.price)
  )
    throw new ProductValidationError('comparePrice')
  if (input.images.some((image) => !/^https?:\/\//.test(image)))
    throw new ProductValidationError('images')
  if (input.images.length > MAX_PRODUCT_IMAGES)
    throw new ProductValidationError('images')
  if (!PALETTE_OPTIONS.includes(input.palette))
    throw new ProductValidationError('palette')
  if (!GENDER_OPTIONS.includes(input.gender))
    throw new ProductValidationError('gender')

  validateSizes(input.sizes)
}

export interface CreateResult {
  id: string
  slug: string
}

/**
 * `slug` et `sku` portent une contrainte UNIQUE en base. On la verifie avant
 * l'ecriture pour renvoyer une erreur de formulaire exploitable plutot qu'une
 * violation SQL opaque.
 */
async function isSkuTaken(sku: string): Promise<boolean> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('id')
    .eq('sku', sku)
    .maybeSingle()

  if (error) throw new Error(`products: ${error.message}`)

  return data !== null
}

/**
 * Deux declenchements de l'IA sur le meme modele couleurs differentes
 * aboutissent a la meme reference. Plutot que de rejeter la fiche, on
 * suffixe : l'admin cree le produit sans reprise manuelle.
 */
export async function suggestFreeSku(preferred: string): Promise<string> {
  const base = preferred.trim().toUpperCase()

  if (base.length < 3) throw new ProductValidationError('sku')

  if (!(await isSkuTaken(base))) return base

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${base}-${suffix}`

    if (!(await isSkuTaken(candidate))) return candidate
  }

  throw new ProductValidationError('skuTaken')
}

async function assertSlugFree(slug: string, exceptId?: string): Promise<void> {
  const query = insforgeAdmin().database.from('products').select('id').eq('slug', slug)

  // En edition, le produit garde sa propre URL : on ne doit pas le comparer a
  // lui-meme, sinon toute renommageation echouerait.
  const { data, error } = exceptId ? await query.neq('id', exceptId).maybeSingle() : await query.maybeSingle()

  if (error) throw new Error(`products: ${error.message}`)
  if (data) throw new ProductValidationError('slugTaken')
}

async function slugExists(slug: string): Promise<boolean> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(`products: ${error.message}`)

  return data !== null
}

/** Slug libre le plus proche de `base`, suffixe numerique en cas de collision. */
async function freeSlug(base: string): Promise<string> {
  if (!(await slugExists(base))) return base

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${base}-${suffix}`
    if (!(await slugExists(candidate))) return candidate
  }

  throw new ProductValidationError('slugTaken')
}

async function hasChildren(id: string): Promise<boolean> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('id')
    .eq('parent_id', id)

  if (error) throw new Error(`products: ${error.message}`)

  return (data ?? []).length > 0
}

/**
 * La hierarchie reste volontairement plate : un modele (racine, `parent_id`
 * null) et ses coloris. Un parent doit donc etre une racine, et une fiche qui a
 * deja des coloris ne peut pas devenir elle-meme un coloris — sinon les petits
 * coloris se retrouveraient orphelins sous une fiche desormais rattachee.
 */
async function assertParentValid(parentId: string, selfId?: string): Promise<void> {
  if (selfId && parentId === selfId) throw new ProductValidationError('parent')

  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('id, parent_id')
    .eq('id', parentId)
    .maybeSingle()

  if (error) throw new Error(`products: ${error.message}`)
  if (!data) throw new ProductValidationError('parentNotFound')

  if ((data as unknown as { parent_id: string | null }).parent_id !== null)
    throw new ProductValidationError('parentNotRoot')

  if (selfId && (await hasChildren(selfId)))
    throw new ProductValidationError('parentHasChildren')
}

export interface UpdateResult {
  id: string
  slug: string
}

export async function createProduct(input: ProductInput): Promise<CreateResult> {
  validateProduct(input)

  const slug = slugify(input.slug || input.name)
  if (slug.length === 0) throw new ProductValidationError('slug')

  await assertSlugFree(slug)

  const sizes = [...input.sizes].sort((a, b) => a.size - b.size)
  const images = input.images.map((image) => image.trim()).filter(Boolean)
  const sku = input.sku.trim() ? await suggestFreeSku(input.sku) : null

  const parentId = input.parentId ?? null
  if (parentId !== null) await assertParentValid(parentId)

  const { data, error } = await insforgeAdmin()
    .database
    .from('products')
    .insert({
      name: input.name.trim(),
      slug,
      sku,
      brand: input.brand.trim() || 'Q2M',
      description: input.description.trim() || null,
      colorway: input.colorway.trim() || 'Standard',
      palette: input.palette,
      price: input.price,
      compare_price: input.comparePrice,
      stock: totalStock(sizes),
      sizes,
      images,
      category_id: input.categoryId,
      gender: input.gender,
      featured: input.featured,
      active: input.active,
      is_new_drop: input.isNewDrop,
      parent_id: parentId,
      release_date: normalizeDate(input.releaseDate ?? null),
      drop_ends_at: normalizeDate(input.dropEndsAt ?? null),
    })
    .select('id, slug')
    .single()

  if (error) {
    // La contrainte UNIQUE peut encore tomber en course concurrente.
    if (/duplicate key|unique/i.test(error.message))
      throw new ProductValidationError('slugTaken')

    throw new Error(`products: ${error.message}`)
  }

  const row = data as unknown as CreateResult

  return row
}

/**
 * Cree un **brouillon** de produit (flux Telegram IA) : fiche incomplète
 * (prix 0, pointures vides, inactive) que l'admin complète depuis le
 * dashboard.
 *
 * Contrairement a `createProduct`, on saute la validation stricte du prix et
 * des pointures : le caractere volontairement incomplet du brouillon est
 * porteur de sens (l'admin fixe le prix et les tailles plus tard). On
 * verifie neanmoins l'essentiel (nom, visuels, unicite slug/SKU) pour ne pas
 * ecrire une fiche cassée.
 */
export async function createDraftProduct(input: {
  name: string
  slug: string
  sku: string
  brand: string
  description: string
  colorway: string
  images: string[]
  gender: ProductGender
  palette: SneakerPalette
}): Promise<CreateResult> {
  if (input.name.trim().length < 2) throw new ProductValidationError('name')
  if (input.images.length === 0 || input.images.some((image) => !/^https?:\/\//.test(image)))
    throw new ProductValidationError('images')
  if (input.images.length > MAX_PRODUCT_IMAGES) throw new ProductValidationError('images')
  if (!PALETTE_OPTIONS.includes(input.palette)) throw new ProductValidationError('palette')
  if (!GENDER_OPTIONS.includes(input.gender)) throw new ProductValidationError('gender')

  const slug = slugify(input.slug || input.name)
  if (slug.length === 0) throw new ProductValidationError('slug')

  await assertSlugFree(slug)

  const sku = await suggestFreeSku(input.sku)

  const { data, error } = await insforgeAdmin()
    .database
    .from('products')
    .insert({
      name: input.name.trim(),
      slug,
      sku,
      brand: input.brand.trim() || 'Q2M',
      description: input.description.trim() || null,
      colorway: input.colorway.trim() || 'Standard',
      palette: input.palette,
      price: 0,
      compare_price: null,
      stock: 0,
      sizes: [],
      images: input.images.map((image) => image.trim()).filter(Boolean),
      category_id: null,
      gender: input.gender,
      featured: false,
      active: false, // Inactif tant que le prix/les tailles ne sont pas fixes
      is_new_drop: false,
    })
    .select('id, slug')
    .single()

  if (error) {
    if (/duplicate key|unique/i.test(error.message))
      throw new ProductValidationError('slugTaken')

    throw new Error(`products: ${error.message}`)
  }

  return data as unknown as CreateResult
}

/** Champs de bas niveau acceptes par une edition partielle. */
export interface ProductPatch {
  name?: string
  slug?: string
  sku?: string | null
  brand?: string | null
  description?: string | null
  colorway?: string | null
  images?: string[]
  price?: number
  comparePrice?: number | null
  categoryId?: string | null
  gender?: ProductGender
  palette?: SneakerPalette
  sizes?: { size: number; stock: number }[]
  featured?: boolean
  active?: boolean
  isNewDrop?: boolean
  parentId?: string | null
  releaseDate?: string | null
  dropEndsAt?: string | null
}

/**
 * Applique une edition partielle sur un produit existant.
 *
 * Seuls les champs fournis sont ecrits : c'est ce qui permet aux bascules
 * rapides (activer, mettre en avant, nouveau drop) de ne pas exiger un
 * formulaire complet, et evite d'ecraser un champ avec une valeur vide issue
 * d'un formulaire partiellement rempli.
 *
 * Le stock global est toujours recalcule depuis les pointures fournies : les
 * deux colonnes doivent rester coherentes.
 */
export async function updateProduct(id: string, patch: ProductPatch): Promise<UpdateResult> {
  const { data: current, error: readError } = await insforgeAdmin()
    .database.from('products')
    .select('id,slug,price,images')
    .eq('id', id)
    .maybeSingle()

  if (readError) throw new Error(`products: ${readError.message}`)
  if (!current) throw new ProductValidationError('notFound')

  const existing = current as unknown as {
    id: string
    slug: string
    price: number
    images: string[] | null
  }
  const row: Record<string, unknown> = {}

  if (patch.name !== undefined) {
    if (patch.name.trim().length < 2) throw new ProductValidationError('name')
    row.name = patch.name.trim()
  }

  if (patch.slug !== undefined) {
    const slug = slugify(patch.slug || patch.name || '')
    if (slug.length === 0) throw new ProductValidationError('slug')
    await assertSlugFree(slug, id)
    row.slug = slug
  }

  if (patch.sku !== undefined) {
    const sku = patch.sku?.trim().toUpperCase() || null
    if (sku !== null && (await isSkuTakenByOther(sku, id)))
      throw new ProductValidationError('skuTaken')
    row.sku = sku
  }

  if (patch.brand !== undefined) row.brand = patch.brand?.trim() || null
  if (patch.description !== undefined) row.description = patch.description?.trim() || null
  if (patch.colorway !== undefined) row.colorway = patch.colorway?.trim() || null

  if (patch.images !== undefined) {
    if (patch.images.some((image) => !/^https?:\/\//.test(image)))
      throw new ProductValidationError('images')
    if (patch.images.length > MAX_PRODUCT_IMAGES) throw new ProductValidationError('images')
    row.images = patch.images.map((image) => image.trim()).filter(Boolean)
  }

  if (patch.price !== undefined) {
    if (!Number.isFinite(patch.price) || patch.price <= 0) throw new ProductValidationError('price')
    row.price = patch.price
  }

  if (patch.comparePrice !== undefined) {
    const reference = patch.price ?? existing.price
    if (
      patch.comparePrice !== null &&
      (!Number.isFinite(patch.comparePrice) || patch.comparePrice <= reference)
    )
      throw new ProductValidationError('comparePrice')
    row.compare_price = patch.comparePrice
  }

  if (patch.categoryId !== undefined) row.category_id = patch.categoryId

  if (patch.parentId !== undefined) {
    if (patch.parentId === null) {
      row.parent_id = null
    } else {
      await assertParentValid(patch.parentId, id)
      row.parent_id = patch.parentId
    }
  }

  if (patch.gender !== undefined) {
    if (!GENDER_OPTIONS.includes(patch.gender)) throw new ProductValidationError('gender')
    row.gender = patch.gender
  }

  if (patch.palette !== undefined) {
    if (!PALETTE_OPTIONS.includes(patch.palette)) throw new ProductValidationError('palette')
    row.palette = patch.palette
  }

  if (patch.sizes !== undefined) {
    validateSizes(patch.sizes)
    const sizes = [...patch.sizes].sort((a, b) => a.size - b.size)
    row.sizes = sizes
    row.stock = totalStock(sizes)
  }

  if (patch.featured !== undefined) row.featured = patch.featured
  if (patch.active !== undefined) row.active = patch.active
  if (patch.isNewDrop !== undefined) row.is_new_drop = patch.isNewDrop
  if (patch.releaseDate !== undefined)
    row.release_date = normalizeDate(patch.releaseDate)
  if (patch.dropEndsAt !== undefined)
    row.drop_ends_at = normalizeDate(patch.dropEndsAt)

  if (Object.keys(row).length === 0) {
    return { id: existing.id, slug: existing.slug }
  }

  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .update(row)
    .eq('id', id)
    .select('id, slug')
    .single()

  if (error) {
    if (/duplicate key|unique/i.test(error.message)) throw new ProductValidationError('slugTaken')
    throw new Error(`products: ${error.message}`)
  }

  /**
   * Les visuels retires de la fiche sont supprimes du bucket uniquement une
   * fois la mise a jour confirmee — sinon un echec laisserait la fiche pointee
   * sur des objets deja detruits. On compare l'ancienne liste a la nouvelle.
   */
  if (patch.images !== undefined) {
    const nextImages = row.images as string[]
    const removed = (existing.images ?? []).filter((url) => !nextImages.includes(url))
    await deleteProductImages(removed)
  }

  return data as unknown as UpdateResult
}

/** Variante de `isSkuTaken` qui ignore le produit en cours d'edition. */
async function isSkuTakenByOther(sku: string, exceptId: string): Promise<boolean> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('id')
    .eq('sku', sku)
    .neq('id', exceptId)
    .maybeSingle()

  if (error) throw new Error(`products: ${error.message}`)

  return data !== null
}

/**
 * Supprime definitivement une fiche produit.
 *
 * `order_items.product_id` est pose en ON DELETE RESTRICT : un produit deja
 * vendu ne peut pas disparaitre, sinon l'historique commercial et le classement
 * « top produits » perdraient leur sens. L'admin doit le desactiver plutot.
 */
export async function deleteProduct(id: string): Promise<void> {
  const { data: current, error: readError } = await insforgeAdmin()
    .database.from('products')
    .select('images')
    .eq('id', id)
    .maybeSingle()

  if (readError) throw new Error(`products: ${readError.message}`)

  const { error } = await insforgeAdmin().database.from('products').delete().eq('id', id)

  if (error) {
    if (/restrict|violates foreign key/i.test(error.message))
      throw new ProductValidationError('hasSales')
    throw new Error(`products: ${error.message}`)
  }

  /**
   * Une fois la ligne supprimee seulement, on purge les visuels du bucket :
   * supprimer les objets d'abord laisserait une fiche cassee si le DELETE
   * echouait (produit deja vendu, ON DELETE RESTRICT).
   */
  const images = (current as unknown as { images: string[] | null } | null)?.images ?? []
  await deleteProductImages(images)
}

/**
 * Retourne le slug d'un produit, ou null s'il n'existe pas. Sert aux actions qui
 * doivent nommer un dossier de stockage avant l'ecriture.
 */
export async function getProductSlug(id: string): Promise<string | null> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select('slug')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`products: ${error.message}`)

  return (data as unknown as { slug: string } | null)?.slug ?? null
}

interface DuplicateSource {
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
  category_id: string | null
  gender: ProductGender | null
  parent_id: string | null
  release_date: string | null
  drop_ends_at: string | null
  sizes: { size: number | string; stock: number }[] | null
}

export interface DuplicateOptions {
  colorway?: string
  sku?: string | null
}

/**
 * Cree un coloris a partir d'une fiche existante.
 *
 * Les champs descriptifs sont recopies, mais le stock repart a zero et les
 * visuels sont vides : un coloris a ses propres photos et son propre stock, il
 * ne les partage pas avec la fiche source. La nouvelle fiche rejoint le meme
 * modele — on rattache a la racine de la source, pas a la source elle-meme, pour
 * qu'une copie de coloris reste au meme niveau que ses freres.
 */
export async function duplicateProduct(
  sourceId: string,
  options: DuplicateOptions = {}
): Promise<CreateResult> {
  const { data, error } = await insforgeAdmin()
    .database.from('products')
    .select(
      'id, name, slug, sku, brand, description, colorway, palette, hover_palette, price, compare_price, category_id, gender, parent_id, release_date, drop_ends_at, sizes'
    )
    .eq('id', sourceId)
    .maybeSingle()

  if (error) throw new Error(`products: ${error.message}`)
  if (!data) throw new ProductValidationError('notFound')

  const source = data as unknown as DuplicateSource
  const root = source.parent_id ?? source.id

  const colorway = options.colorway?.trim() || `${source.colorway ?? 'Standard'} (copie)`

  const baseSlug = slugify(`${source.slug}-${colorway}`)
  const slug = await freeSlug(baseSlug.length > 0 ? baseSlug : `${source.slug}-2`)

  const skuSeed = options.sku?.trim() || source.sku
  const sku = skuSeed ? await suggestFreeSku(skuSeed) : null

  const sizes = (source.sizes ?? []).map((entry) => ({
    size: Number(entry.size),
    stock: 0,
  }))

  const { data: created, error: insertError } = await insforgeAdmin()
    .database
    .from('products')
    .insert({
      name: source.name,
      slug,
      sku,
      brand: source.brand,
      description: source.description,
      colorway,
      palette: source.palette,
      hover_palette: source.hover_palette,
      price: source.price,
      compare_price: source.compare_price,
      stock: 0,
      sizes,
      images: [],
      category_id: source.category_id,
      gender: source.gender,
      featured: false,
      active: true,
      is_new_drop: false,
      parent_id: root,
      release_date: source.release_date,
      drop_ends_at: source.drop_ends_at,
    })
    .select('id, slug')
    .single()

  if (insertError) {
    if (/duplicate key|unique/i.test(insertError.message))
      throw new ProductValidationError('slugTaken')
    throw new Error(`products: ${insertError.message}`)
  }

  return created as unknown as CreateResult
}
import 'server-only'

import { insforgeAdmin } from './insforge-admin'
import { analyzeProductImage, type ProductDraft } from './gemini'
import { uploadProductImage } from './admin-storage'
import { createProduct, suggestFreeSku, type ProductInput } from './admin-products'
import { slugify } from './utils'

/**
 * Brouillons de produits IA en attente de confirmation Telegram.
 *
 * Flux : l'admin envoie une photo au bot → upload storage → analyse IA →
 * brouillon persisté → le bot pose les questions (prix, pointures, catégorie)
 * → le brouillon complet → récapitulatif + boutons Confirmer/Annuler →
 * produit complet et actif créé.
 */

export interface ProductDraftRow {
  id: string
  chat_id: number
  image_url: string
  draft: ProductDraft
  answers: Q2MAnswers
  product_id: string | null
  product_slug: string | null
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED'
  error: string | null
  created_at: string
  resolved_at: string | null
}

/**
 * Réponses collectées au fil du formulaire interactif. Une valeur absente
 * signifie « pas encore demandée » ; `categoryId: null` signifie « catégorie
 * explicitement ignorée » (le champ est Optionnel côté base).
 */
export interface Q2MAnswers {
  price?: number
  sizes?: { size: number; stock: number }[]
  categoryId?: string | null
}

export type DraftStep = 'price' | 'sizes' | 'category' | 'ready'

/** Étape suivante du formulaire, dérivée des réponses déjà présentes. */
export function draftStep(row: Pick<ProductDraftRow, 'answers'>): DraftStep {
  const a = row.answers ?? {}
  if (typeof a.price !== 'number' || !Number.isFinite(a.price) || a.price <= 0) return 'price'
  if (!Array.isArray(a.sizes) || a.sizes.length === 0) return 'sizes'
  if (!('categoryId' in a)) return 'category'
  return 'ready'
}

/**
 * Téléverse une photo produit et lance l'analyse IA.
 * Retourne le brouillon créé (en attente de réponses).
 */
export async function createProductDraft(params: {
  chatId: number
  imageBase64: string
  mimeType: string
  locale: string
}): Promise<ProductDraftRow> {
  const { chatId, imageBase64, mimeType, locale } = params

  // 1. Upload de l'image dans le storage (bucket public)
  const uploaded = await uploadProductImage(
    { base64: imageBase64, mimeType },
    'drafts'
  )

  // 2. Analyse IA de la photo
  const draft = await analyzeProductImage(
    { base64: imageBase64, mimeType },
    locale
  )

  // 3. Persistance du brouillon (sans réponse pour l'instant)
  const { data, error } = await insforgeAdmin()
    .database.from('telegram_product_drafts')
    .insert({
      chat_id: chatId,
      image_url: uploaded.url,
      draft: draft as unknown as Record<string, unknown>,
      answers: {},
      status: 'PENDING',
    })
    .select()
    .single()

  if (error) {
    // Nettoyer l'image uploadée si la persistance échoue
    console.error('telegram_product_drafts insert:', error.message)
    throw new Error(`Échec création brouillon: ${error.message}`)
  }

  return normalizeRow(data)
}

function normalizeRow(raw: Record<string, unknown>): ProductDraftRow {
  return {
    ...(raw as unknown as ProductDraftRow),
    answers: (raw.answers as Q2MAnswers) ?? {},
  }
}

/** Fusionne une réponse dans le brouillon (lecture-modification-écriture). */
export async function saveDraftAnswers(
  draftId: string,
  patch: Q2MAnswers
): Promise<void> {
  const db = insforgeAdmin().database
  const { data, error } = await db
    .from('telegram_product_drafts')
    .select('answers')
    .eq('id', draftId)
    .single()

  if (error) throw new Error(`Lecture brouillon: ${error.message}`)

  const merged = { ...((data.answers as Q2MAnswers) ?? {}), ...patch }
  const { error: upErr } = await db
    .from('telegram_product_drafts')
    .update({ answers: merged })
    .eq('id', draftId)

  if (upErr) throw new Error(`Sauvegarde brouillon: ${upErr.message}`)
}

/** Brouillon en attente le plus récent d'un chat (pour le formulaire). */
export async function findPendingDraft(chatId: number): Promise<ProductDraftRow | null> {
  const { data, error } = await insforgeAdmin()
    .database.from('telegram_product_drafts')
    .select('*')
    .eq('chat_id', chatId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Brouillon: ${error.message}`)
  return data ? normalizeRow(data as Record<string, unknown>) : null
}

// ---------------------------------------------------------------------------
// Parsing des réponses
// ---------------------------------------------------------------------------

/** Accepte « 202.50 », « 202,50 », « 202 ». Renvoie null si invalide. */
export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = Number.parseFloat(cleaned)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

/**
 * Formats acceptés : « 40:2, 41:3 » (taille:stock), « 40-45 » (stock 1),
 * « 40,41,42 » (stock 1), « 40 ». Renvoie null si invalide.
 */
export function parseSizes(text: string): { size: number; stock: number }[] | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  const result = new Map<number, number>()

  const range = t.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/)
  if (range) {
    const from = Number.parseInt(range[1], 10)
    const to = Number.parseInt(range[2], 10)
    if (to < from || to - from > 40) return null
    for (let s = from; s <= to; s++) result.set(s, 1)
    return toPairs(result)
  }

  const parts = t.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null

  for (const part of parts) {
    const [sizeStr, stockStr] = part.split(':').map((s) => s.trim())
    const size = Number.parseInt(sizeStr, 10)
    if (!Number.isInteger(size) || size < 1 || size > 70) return null
    let stock = 1
    if (stockStr !== undefined) {
      stock = Number.parseInt(stockStr, 10)
      if (!Number.isInteger(stock) || stock < 0) return null
    }
    result.set(size, (result.get(size) ?? 0) + stock)
  }

  return toPairs(result)
}

function toPairs(m: Map<number, number>): { size: number; stock: number }[] {
  return [...m.entries()]
    .map(([size, stock]) => ({ size, stock }))
    .sort((a, b) => a.size - b.size)
}

export interface DraftCategory {
  id: string
  name: string
  slug: string
}

export async function listCategories(): Promise<DraftCategory[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('categories')
    .select('id, name, slug')
    .order('name')

  if (error) throw new Error(`Catégories: ${error.message}`)
  return (data ?? []) as DraftCategory[]
}

/** Résout une catégorie par slug ou nom, ou 'skip' si ignorer. null si inconnue. */
export async function findCategory(
  value: string
): Promise<{ id: string } | 'skip' | null> {
  const v = value.trim().toLowerCase()
  if (!v) return null
  if (['skip', '-', '0', 'aucune', 'none', 'sans'].includes(v)) return 'skip'
  const cats = await listCategories()
  const found = cats.find(
    (c) => c.slug.toLowerCase() === v || c.name.toLowerCase() === v
  )
  return found ? { id: found.id } : null
}

// ---------------------------------------------------------------------------
// Confirmation / annulation
// ---------------------------------------------------------------------------

/**
 * Confirme un brouillon complété et crée le produit COMPLET (prix, pointures,
 * catégorie collectés), visible en boutique (actif). Refuse si des champs
 * manquent encore.
 */
export async function confirmProductDraft(draftId: string): Promise<{
  productId: string
  slug: string
  name: string
}> {
  const db = insforgeAdmin().database

  const { data: draft, error: readError } = await db
    .from('telegram_product_drafts')
    .select('*')
    .eq('id', draftId)
    .maybeSingle()

  if (readError) throw new Error(`Lecture brouillon: ${readError.message}`)
  if (!draft) throw new Error('Brouillon introuvable')
  if (draft.status !== 'PENDING') throw new Error('Brouillon déjà traité')

  const row = normalizeRow(draft as Record<string, unknown>)
  const d = row.draft
  const a = row.answers

  if (typeof a.price !== 'number' || a.price <= 0) throw new Error('Prix manquant.')
  if (!Array.isArray(a.sizes) || a.sizes.length === 0)
    throw new Error('Pointures manquantes.')

  const sku = await suggestFreeSku(d.sku)
  const slug = slugify(`${d.brand}-${d.name}-${sku.toLowerCase()}`)

  const input: ProductInput = {
    name: d.name,
    slug,
    sku,
    brand: d.brand,
    description: d.description,
    colorway: d.colorway,
    images: [row.image_url],
    price: a.price,
    comparePrice: null,
    categoryId: a.categoryId ?? null,
    gender: d.gender,
    palette: d.palette,
    sizes: a.sizes,
    featured: false,
    active: true,
    isNewDrop: false,
  }

  const created = await createProduct(input)

  const { error: updateError } = await db
    .from('telegram_product_drafts')
    .update({
      status: 'CONFIRMED',
      product_id: created.id,
      product_slug: created.slug,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', draftId)

  if (updateError) {
    console.error('telegram_product_drafts update:', updateError.message)
  }

  return { productId: created.id, slug: created.slug, name: d.name }
}

/**
 * Annule un brouillon.
 */
export async function cancelProductDraft(draftId: string): Promise<void> {
  const { error } = await insforgeAdmin()
    .database.from('telegram_product_drafts')
    .update({
      status: 'CANCELLED',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', draftId)

  if (error) throw new Error(`Annulation brouillon: ${error.message}`)
}

/**
 * Liste les brouillons en attente d'un chat.
 */
export async function listPendingDrafts(chatId: number): Promise<ProductDraftRow[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('telegram_product_drafts')
    .select('*')
    .eq('chat_id', chatId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw new Error(`Liste brouillons: ${error.message}`)

  return (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>))
}

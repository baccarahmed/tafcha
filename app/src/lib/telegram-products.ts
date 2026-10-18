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
 * brouillon persisté → formulaire Telegram → confirmation → produit créé.
 */

export interface ProductDraftRow {
  id: string
  chat_id: number
  image_url: string
  draft: ProductDraft
  product_id: string | null
  product_slug: string | null
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED'
  error: string | null
  created_at: string
  resolved_at: string | null
}

/**
 * Téléverse une photo produit et lance l'analyse IA.
 * Retourne le brouillon créé (en attente de confirmation).
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

  // 3. Persistance du brouillon
  const { data, error } = await insforgeAdmin()
    .database.from('telegram_product_drafts')
    .insert({
      chat_id: chatId,
      image_url: uploaded.url,
      draft: draft as unknown as Record<string, unknown>,
      status: 'PENDING',
    })
    .select()
    .single()

  if (error) {
    // Nettoyer l'image uploadée si la persistance échoue
    console.error('telegram_product_drafts insert:', error.message)
    throw new Error(`Échec création brouillon: ${error.message}`)
  }

  return data as unknown as ProductDraftRow
}

/**
 * Confirme un brouillon et crée le produit.
 * Utilise les mêmes fonctions que le back-office dashboard.
 */
export async function confirmProductDraft(draftId: string): Promise<{
  productId: string
  slug: string
}> {
  const db = insforgeAdmin().database

  // 1. Lire le brouillon
  const { data: draft, error: readError } = await db
    .from('telegram_product_drafts')
    .select('*')
    .eq('id', draftId)
    .maybeSingle()

  if (readError) throw new Error(`Lecture brouillon: ${readError.message}`)
  if (!draft) throw new Error('Brouillon introuvable')
  if (draft.status !== 'PENDING') throw new Error('Brouillon déjà traité')

  const draftData = draft.draft as unknown as ProductDraft

  // 2. Construire le ProductInput
  const sku = await suggestFreeSku(draftData.sku)
  const slug = slugify(`${draftData.brand}-${draftData.name}-${sku.toLowerCase()}`)

  const input: ProductInput = {
    name: draftData.name,
    slug,
    sku,
    brand: draftData.brand,
    description: draftData.description,
    colorway: draftData.colorway,
    images: [draft.image_url],
    price: 0, // L'admin fixe le prix après
    comparePrice: null,
    categoryId: null, // L'admin assigne la catégorie après
    gender: draftData.gender,
    palette: draftData.palette,
    sizes: [], // L'admin ajoute les pointures après
    featured: false,
    active: false, // Inactif jusqu'à complétion
    isNewDrop: false,
  }

  // 3. Créer le produit
  const created = await createProduct(input)

  // 4. Marquer le brouillon comme confirmé
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

  return { productId: created.id, slug: created.slug }
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

  return (data ?? []) as unknown as ProductDraftRow[]
}

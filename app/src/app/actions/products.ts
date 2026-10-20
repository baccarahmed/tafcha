'use server'

import { revalidateCatalog } from '@/lib/revalidate-catalog'
import { requireAdmin } from '@/lib/admin-guard'
import {
  createProduct,
  getProductSlug,
  ProductValidationError,
  type ProductInput,
} from '@/lib/admin-products'
import { analyzeProductImage, AiConfigError, AiQuotaError, type ProductDraft } from '@/lib/gemini'
import {
  uploadProductImage,
  deleteProductImage,
  storageKeyFromUrl,
  ImageUploadError,
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
} from '@/lib/admin-storage'
import { slugify } from '@/lib/utils'

export type CreateProductResult =
  | { ok: true; slug: string }
  | { ok: false; field: string }

/**
 * Cree un produit depuis le back-office.
 *
 * Le role est relu en base a chaque appel : le layout du dashboard n'est qu'un
 * garde de rendu, la vraie autorisation doit tenir ici, sur le chemin d'ecriture.
 *
 * L'action renvoie un resultat structure au lieu de lever : le formulaire doit
 * pouvoir afficher une erreur de validation a cote du champ concerne.
 */
export async function createProductAction(
  input: ProductInput,
  images?: { base64: string; mimeType: string }[]
): Promise<CreateProductResult> {
  const user = await requireAdmin()

  if (!user) {
    return { ok: false, field: 'forbidden' }
  }

  try {
    const uploadedKeys: string[] = []

    try {
      let urls = input.images

      // Le dossier du bucket porte le slug final pour que l'URL reste devinable
      // et que les visuels d'un produit restent regroupes.
      if (images?.length) {
        const slug = slugify(input.slug || input.name)

        urls = []

        for (const image of images) {
          const uploaded = await uploadProductImage(image, slug)

          uploadedKeys.push(uploaded.key)
          urls.push(uploaded.url)
        }
      }

      const created = await createProduct({ ...input, images: urls })

      revalidateCatalog()

      return { ok: true, slug: created.slug }
    } catch (error) {
      // Les photos ne doivent pas survivre a une fiche rejetee : slug deja
      // pris, prix incoherent, erreur SQL. Sans ce retrait, le bucket garde des
      // objets que personne ne reference.
      if (uploadedKeys.length > 0) {
        await Promise.all(uploadedKeys.map((key) => deleteProductImage(key))).catch(
          () => undefined
        )
      }

      throw error
    }
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return { ok: false, field: error.field }
    }

    if (error instanceof ImageUploadError) {
      return { ok: false, field: error.reason }
    }

    throw error
  }
}

export type AnalyzeError =
  | 'forbidden'
  | 'notConfigured'
  | 'quota'
  | 'tooLarge'
  | 'unsupported'
  | 'failed'

export type AnalyzeResult =
  | { ok: true; draft: ProductDraft }
  | { ok: false; error: AnalyzeError }

/**
 * Pre-remplit la fiche produit a partir d'une photo.
 *
 * La cle Gemini reste ici : l'action est le seul point d'appel cote serveur.
 * Aucun produit n'est cree ni aucune image televersee a cette etape : la photo
 * reste cote navigateur et n'est hebergee qu'a la creation, une fois le slug
 * valide. L'admin valide le formulaire entre les deux.
 */
export async function analyzeProductImageAction(
  image: { base64: string; mimeType: string },
  locale: string,
): Promise<AnalyzeResult> {
  const user = await requireAdmin()

  if (!user) {
    return { ok: false, error: 'forbidden' }
  }

  if (!ALLOWED_IMAGE_MIME.has(image.mimeType)) {
    return { ok: false, error: 'unsupported' }
  }

  // Le base64 pese ~33% de plus que le binaire.
  if (image.base64.length * 0.75 > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'tooLarge' }
  }

  try {
    return { ok: true, draft: await analyzeProductImage(image, locale) }
  } catch (error) {
    if (error instanceof AiConfigError) return { ok: false, error: 'notConfigured' }

    // Quota du fournisseur atteint : message dedie plutot que « analyse
    // echouee », pour que l'admin comprenne que le service a refuse l'appel.
    if (error instanceof AiQuotaError) return { ok: false, error: 'quota' }

    // Une panne du fournisseur ne doit pas casser la page : le
    // formulaire reste utilisable a la main.
    console.error('analyse ia :', error)

    return { ok: false, error: 'failed' }
  }
}

export type ProductImageUploadResult =
  | { ok: true; url: string; key: string }
  | {
      ok: false
      reason: 'forbidden' | 'notFound' | 'unsupported' | 'tooLarge' | 'uploadFailed'
    }

/**
 * Ajoute un visuel a une fiche existante.
 *
 * L'edition ne permettait jusqu'ici que de retirer des photos : ce point
 * d'entree comble le manque, avec les memes garde-fous que la creation (role
 * relu en base, formats et taille verifies dans `uploadProductImage`). La cle
 * du dossier est relue depuis le slug courant, pas du client.
 */
export async function uploadProductImageAction(
  productId: string,
  image: { base64: string; mimeType: string }
): Promise<ProductImageUploadResult> {
  const user = await requireAdmin()

  if (!user) return { ok: false, reason: 'forbidden' }

  try {
    const slug = await getProductSlug(productId)

    if (!slug) return { ok: false, reason: 'notFound' }

    const uploaded = await uploadProductImage(image, slug)

    return { ok: true, url: uploaded.url, key: uploaded.key }
  } catch (error) {
    if (error instanceof ImageUploadError) return { ok: false, reason: error.reason }

    console.error('upload produit :', error)

    return { ok: false, reason: 'uploadFailed' }
  }
}

/**
 * Supprime un objet du bucket a partir de son URL publique.
 *
 * Ne concerne que les visuels pas encore rattaches a la fiche : un visuel ajoute
 * puis retire avant l'enregistrement, ou un upload abandonne a la fermeture du
 * dialogue. Les visuels deja en base sont purges par `updateProduct`, qui
 * compare ancienne et nouvelle liste une fois l'ecriture confirmee.
 */
export async function deleteProductImageAction(url: string): Promise<{ ok: boolean }> {
  const user = await requireAdmin()

  if (!user) return { ok: false }

  const key = storageKeyFromUrl(url)

  if (!key) return { ok: false }

  await deleteProductImage(key).catch(() => undefined)

  return { ok: true }
}
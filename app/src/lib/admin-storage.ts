import 'server-only'

import { randomUUID } from 'node:crypto'
import { insforgeAdmin } from '@/lib/insforge-admin'

/**
 * Stockage des visuels produits.
 *
 * Le bucket est public : la vitrine doit servir l'image a un visiteur non
 * connecte. L'ecriture, elle, passe par la cle serveur et une server action
 * qui reverifie le role admin.
 */

const BUCKET = 'product-images'

/**
 * Limite unique partagee par l'analyse IA et l'upload : une photo compressee
 * plafonne a 1024 px, donc 4 Mo ne bloquent jamais un cas legitime.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Les raisons reprennent les cles de traduction du formulaire. */
export class ImageUploadError extends Error {
  constructor(
    public readonly reason: 'unsupported' | 'tooLarge' | 'uploadFailed'
  ) {
    super(reason)
    this.name = 'ImageUploadError'
  }
}

export interface UploadedImage {
  /** Cle objet dans le bucket, necessaire pour annuler un upload. */
  key: string
  url: string
}

/**
 * Le dossier porte le slug du produit : les visuels d'une meme reference
 * restent regroupes et l'URL demeure lisible. L'UUID final evite qu'une
 * nouvelle photo n'ecrase un visuel deja en ligne.
 */
function buildKey(slug: string, mimeType: string): string {
  const extension = EXTENSION[mimeType]
  return `${slug}/${randomUUID()}.${extension}`
}

/**
 * Le SDK attend un `Blob` : un Buffer brut part sans `size` et le serveur
 * refuse l'envoi (`size: Required`).
 */
function toBlob(base64: string, mimeType: string): Blob {
  return new Blob([new Uint8Array(Buffer.from(base64, 'base64'))], {
    type: mimeType,
  })
}

export async function uploadProductImage(
  image: { base64: string; mimeType: string },
  slug: string
): Promise<UploadedImage> {
  if (!ALLOWED_IMAGE_MIME.has(image.mimeType)) {
    throw new ImageUploadError('unsupported')
  }

  // Le base64 pese ~33% de plus que le binaire.
  if (image.base64.length * 0.75 > MAX_IMAGE_BYTES) {
    throw new ImageUploadError('tooLarge')
  }

  const bucket = insforgeAdmin().storage.from(BUCKET)
  const key = buildKey(slug, image.mimeType)

  const { data, error } = await bucket.upload(
    key,
    toBlob(image.base64, image.mimeType)
  )

  if (error || !data) {
    throw new ImageUploadError('uploadFailed')
  }

  return { key, url: data.url }
}

/**
 * Annule un upload dont l'insertion en base a echoue : sans cela le bucket
 * accumule des orphelins que personne ne reference.
 */
export async function deleteProductImage(key: string): Promise<void> {
  await insforgeAdmin().storage.from(BUCKET).remove(key)
}
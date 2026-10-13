/**
 * Compression d'une photo cote navigateur avant upload.
 *
 * Une image de smartphone fait plusieurs Mo et le bucket n'a pas besoin de
 * plus que quelques centaines de pixels pour une vignette produit. Le rendu
 * passe par un canvas, donc ce module ne s'utilise que dans un composant client.
 */

export interface CompressedImage {
  base64: string
  mimeType: string
}

/** Formats acceptes par le bucket produit. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Reduit la photo a `maxEdge` sur son plus grand cote et la re-encode en JPEG.
 *
 * Le format de sortie est toujours JPEG : un PNG a fond transparent ressort
 * donc avec un fond opaque (noir), ce qui est le compromis accepte pour une
 * photo produit.
 */
export async function toCompressedBase64(
  file: File,
  { maxEdge = 1024, quality = 0.82 }: { maxEdge?: number; quality?: number } = {}
): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file)

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponible')

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', quality)

  return {
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mimeType: 'image/jpeg',
  }
}

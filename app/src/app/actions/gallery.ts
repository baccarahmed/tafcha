'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/session'
import { saveGalleryImages } from '@/lib/admin-settings'
import {
  uploadGalleryImage,
  deleteProductImage,
  ImageUploadError,
} from '@/lib/admin-storage'

/**
 * Ecritures de la galerie orbitale de la vitrine. Le role est relu en base a
 * chaque appel : le dashboard n'est qu'un garde de rendu.
 */

export type GalleryUploadResult =
  | { ok: true; url: string; key: string }
  | { ok: false; reason: 'forbidden' | 'unsupported' | 'tooLarge' | 'uploadFailed' }

export async function uploadGalleryImageAction(image: {
  base64: string
  mimeType: string
}): Promise<GalleryUploadResult> {
  const user = await getSessionUser()

  if (!user || user.role !== 'ADMIN') {
    return { ok: false, reason: 'forbidden' }
  }

  try {
    const uploaded = await uploadGalleryImage(image)

    return { ok: true, url: uploaded.url, key: uploaded.key }
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return { ok: false, reason: error.reason }
    }

    console.error('galerie :', error)

    return { ok: false, reason: 'uploadFailed' }
  }
}

export async function updateGalleryImages(
  images: string[]
): Promise<{ ok: boolean }> {
  const user = await getSessionUser()

  if (!user || user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }

  const clean = images
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    .slice(0, 24)

  await saveGalleryImages(clean)

  revalidatePath('/', 'layout')

  return { ok: true }
}

/**
 * Supprime l'objet du bucket quand l'admin retire un visuel. On ne touche qu'aux
 * objets uploades (dossier `gallery/`) : les visuels locaux livres avec le code
 * restent en place. La cle est re-derivee de l'URL publique InsForge
 * (`/objects/<cle url-encodee>`), seule donnee persistee en base.
 */
export async function deleteGalleryImageAction(url: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser()

  if (!user || user.role !== 'ADMIN') {
    return { ok: false }
  }

  const key = galleryKeyFromUrl(url)

  if (!key || !key.startsWith('gallery/')) {
    return { ok: false }
  }

  await deleteProductImage(key).catch(() => undefined)

  return { ok: true }
}

function galleryKeyFromUrl(url: string): string | null {
  const marker = '/objects/'
  const index = url.indexOf(marker)

  if (index === -1) return null

  try {
    return decodeURIComponent(url.slice(index + marker.length).split('?')[0])
  } catch {
    return null
  }
}

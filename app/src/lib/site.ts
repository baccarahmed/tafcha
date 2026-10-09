/**
 * Configuration centrale du site, pilotée par variables d'environnement.
 *
 * Rien n'est codé en dur : le nom de la boutique, le domaine et l'ID Meta Pixel
 * se renseignent dans `.env.local` (voir `.env.example`). Tant qu'ils ne sont
 * pas fournis, on retombe sur des valeurs locales sûres pour ne jamais casser
 * le build.
 */

import { Q2M } from './q2m-tokens'

/** Nom public de la boutique (fallback : marque Q2M). */
export const SITE_NAME = process.env.NEXT_PUBLIC_STORE_NAME?.trim() || Q2M.brand

/** Nom long / raison sociale, utilisé comme `alternateName` schema.org. */
export const SITE_NAME_LONG = process.env.NEXT_PUBLIC_STORE_NAME_LONG?.trim() || Q2M.brandFull

/** URL de production de la boutique, sans slash final. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  // Sur Vercel, `VERCEL_URL` porte l'URL du déploiement courant (preview ou
  // prod) : on l'utilise pour que canonicaux/OG/sitemap pointent toujours la
  // source live, même sans variable NEXT_PUBLIC_SITE_URL renseignée.
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/$/, '')

/** ID du Meta Pixel. Vide = aucun tracking chargé. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || ''

/** Construit une URL absolue à partir d'un chemin relatif. */
export function absoluteUrl(path = ''): string {
  if (/^https?:\/\//.test(path)) return path
  const clean = path.startsWith('/') ? path : path ? `/${path}` : ''
  return `${SITE_URL}${clean}`
}
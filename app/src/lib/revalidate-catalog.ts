import 'server-only'

import { revalidatePath, revalidateTag } from 'next/cache'
import { CATALOG_TAG_LIST } from './cache-tags'

/**
 * Invalide les caches de lecture du catalogue apres une ecriture back-office.
 *
 * `revalidatePath` purge le Router Cache (navigation) mais PAS le Data Cache
 * d'`unstable_cache` : sans `revalidateTag`, une fiche modifiee resterait
 * invisible jusqu'a l'expiration de `revalidate`. Les deux sont donc necessaires.
 *
 * A appeler uniquement depuis une Server Action ou un Route Handler.
 */
export function revalidateCatalog(): void {
  revalidatePath('/', 'layout')

  for (const tag of CATALOG_TAG_LIST) {
    revalidateTag(tag)
  }
}

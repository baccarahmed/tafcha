'use server'

import { revalidateCatalog } from '@/lib/revalidate-catalog'
import { saveSiteSettings, type SiteSettingsInput } from '@/lib/admin-settings'
import { requireAdmin } from '@/lib/admin-guard'

/**
 * Persiste les reglages de la boutique depuis le back-office.
 *
 * Le role est relu en base a chaque appel : le dashboard n'est qu'un garde de
 * rendu, la vraie autorisation doit tenir ici, sur le chemin d'ecriture.
 */
export async function updateSiteSettings(
  input: SiteSettingsInput
): Promise<{ ok: boolean }> {
  const user = await requireAdmin()

  if (!user) {
    throw new Error('Forbidden')
  }

  await saveSiteSettings(input)

  revalidateCatalog()

  return { ok: true }
}

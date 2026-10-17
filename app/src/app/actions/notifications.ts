'use server'

import { insforgeAdmin } from '@/lib/insforge-admin'
import { getSessionUser } from '@/lib/session'

/**
 * Marque des notifications comme lues.
 *
 * Ecriture via le client admin filtree sur `recipient_id = session.id` : un
 * client ne peut donc jamais marquer comme lue la notification d'un autre,
 * meme en forgeant la liste d'ids. `read_at` n'est jamais ecrase si deja pose.
 */
export async function markNotificationsReadAction(
  ids: string[]
): Promise<{ ok: boolean }> {
  const user = await getSessionUser().catch(() => null)
  if (!user || !Array.isArray(ids)) return { ok: false }

  const clean = ids.filter((id) => typeof id === 'string' && id.length > 0).slice(0, 100)
  if (clean.length === 0) return { ok: false }

  const { error } = await insforgeAdmin()
    .database.from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', clean)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return { ok: !error }
}

/** Marque toutes les notifications non lues du destinataire comme lues. */
export async function markAllNotificationsReadAction(): Promise<{ ok: boolean }> {
  const user = await getSessionUser().catch(() => null)
  if (!user) return { ok: false }

  const { error } = await insforgeAdmin()
    .database.from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return { ok: !error }
}

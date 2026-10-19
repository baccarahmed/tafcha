'use server'

import { insforgeAdmin } from '@/lib/insforge-admin'
import { getSessionUser } from '@/lib/session'

/**
 * Abonnement push navigateur (PWA installée en raccourci).
 *
 * Seuls les comptes admin peuvent s'abonner : ils sont les destinataires des
 * alertes de nouvelle commande. Le rôle est relu en base à chaque appel.
 */

interface RawSubscription {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

export async function savePushSubscription(
  subscription: RawSubscription
): Promise<{ ok: boolean; reason?: string }> {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { ok: false, reason: 'forbidden' }

  const endpoint = subscription.endpoint
  const p256dh = subscription.keys?.p256dh
  const auth = subscription.keys?.auth

  if (!endpoint || !p256dh || !auth) return { ok: false, reason: 'invalid' }

  const { error } = await insforgeAdmin()
    .database.from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

  if (error) {
    console.error('push_subscriptions upsert:', error.message)
    return { ok: false, reason: 'database' }
  }

  return { ok: true }
}

export async function removePushSubscription(
  endpoint: string
): Promise<{ ok: boolean }> {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return { ok: false }

  const { error } = await insforgeAdmin()
    .database.from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)

  if (error) console.error('push_subscriptions delete:', error.message)

  return { ok: !error }
}

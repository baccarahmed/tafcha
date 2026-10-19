import 'server-only'

import webpush from 'web-push'
import { insforgeAdmin } from './insforge-admin'

/**
 * Notifications push navigateur (PWA installée en raccourci sur téléphone).
 *
 * L'admin s'abonne depuis le dashboard (Push API), l'abonnement est stocké dans
 * `push_subscriptions`. À chaque nouvelle commande le serveur pousse une
 * notification à tous les abonnements des comptes admin.
 *
 * Configuration : les clés VAPID sont dans `.env.local`
 * (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`). Sans clés, l'envoi
 * est silencieusement ignoré pour ne pas casser la prise de commande.
 */

export interface PushPayload {
  title: string
  body: string
  url?: string
}

let configured = false

function vapidKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey }
}

function ensureConfigured(): boolean {
  if (configured) return true
  const keys = vapidKeys()
  if (!keys) return false

  webpush.setVapidDetails(
    'mailto:contact@que2marque.tn',
    keys.publicKey,
    keys.privateKey
  )
  configured = true
  return true
}

interface SubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Abonnements des comptes admin (les seuls à recevoir les alertes commande).
 *
 * `push_subscriptions` et `profiles` pointent tous deux vers `auth.users` sans
 * FK directe entre eux : un embed PostgREST `!inner` échouerait, on fait donc
 * deux lectures et on filtre côté application.
 */
async function adminSubscriptions(): Promise<SubscriptionRow[]> {
  const db = insforgeAdmin().database

  const [{ data: subs, error: subErr }, { data: admins, error: adminErr }] =
    await Promise.all([
      db.from('push_subscriptions').select('user_id, endpoint, p256dh, auth'),
      db.from('profiles').select('user_id').eq('role', 'ADMIN'),
    ])

  if (subErr) {
    console.error('push_subscriptions select:', subErr.message)
    return []
  }
  if (adminErr) {
    console.error('profiles select (admin):', adminErr.message)
    return []
  }

  const adminIds = new Set((admins ?? []).map((a) => a.user_id))

  return (subs ?? [])
    .filter((s) => adminIds.has(s.user_id))
    .map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth }))
}

/**
 * Envoie une notification push à tous les appareils admin abonnés.
 * Les abonnements expirés (404/410) sont supprimés de la base.
 */
export async function sendWebPushToAdmins(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return

  const subs = await adminSubscriptions()
  if (subs.length === 0) return

  const body = JSON.stringify(payload)

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        )
      } catch (error: unknown) {
        const status = (error as { statusCode?: number })?.statusCode
        // Abonnement expiré ou révoqué : on le purge pour ne pas re-rater.
        if (status === 404 || status === 410) {
          await insforgeAdmin()
            .database.from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        } else {
          console.error('webpush send:', status ?? error)
        }
      }
    })
  )
}

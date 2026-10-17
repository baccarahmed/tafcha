import 'server-only'

import { insforgeAdmin } from './insforge-admin'
import type { NotificationDTO } from './notifications-types'

interface NotificationRow {
  id: string
  audience: string
  kind: string
  title: string | null
  payload: unknown
  href: string | null
  order_id: string | null
  read_at: string | null
  created_at: string
}

/** Nombre maximum de notifications renvoyees au chargement de la cloche. */
const LIST_LIMIT = 30

/**
 * Notifications d'un destinataire, les plus recentes d'abord.
 *
 * Lecture via le client admin (RLS contourne) filtree sur `recipient_id` : le
 * seul appelant est le composant serveur qui vient de resoudre la session, donc
 * l'identifiant ne peut pas etre falsifie cote client.
 */
export async function listNotifications(userId: string): Promise<NotificationDTO[]> {
  if (!userId) return []

  const { data, error } = await insforgeAdmin()
    .database.from('notifications')
    .select('id,audience,kind,title,payload,href,order_id,read_at,created_at')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT)

  if (error) throw new Error(`notifications: ${error.message}`)

  return ((data ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    audience: row.audience === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
    kind: row.kind,
    title: row.title,
    payload: (row.payload as Record<string, unknown>) ?? {},
    href: row.href,
    orderId: row.order_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }))
}

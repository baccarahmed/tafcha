/**
 * Types et helpers partages entre le serveur (lecture des notifications) et le
 * client (cloche + temps reel). Le texte n'est pas fige en base : on stocke un
 * `kind` et un `payload` structure, et l'affichage choisit la cle i18n selon la
 * langue active (fr/en/ar) au lieu d'un libelle fige cote SQL.
 */

export type NotificationAudience = 'ADMIN' | 'CUSTOMER';

export type NotificationKind =
  | 'order_created'
  | 'order_confirmation'
  | 'order_status_changed'
  | 'contact_message'
  | 'product_review';

export interface NotificationDTO {
  id: string;
  audience: NotificationAudience;
  kind: string;
  title: string | null;
  payload: Record<string, unknown>;
  href: string | null;
  orderId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Canal temps reel personnel d'un utilisateur. */
export function notificationChannel(userId: string): string {
  return `user:${userId}:notifications`
}

/** Identifiant court affiche (les 8 premiers caracteres de l'uuid). */
export function shortOrderId(orderId: string | null | undefined): string {
  return orderId ? orderId.slice(0, 8).toUpperCase() : '—'
}

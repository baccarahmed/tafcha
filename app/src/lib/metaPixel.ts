/**
 * Wrapper typé autour de `window.fbq` (Meta Pixel).
 *
 * Toutes les fonctions sont silencieuses tant que le pixel n'est pas chargé
 * (pas d'ID configuré, consentement refusé, ou script pas encore prêt) : elles
 * ne jettent jamais et ne cassent jamais l'UI.
 */

import { STORE_CURRENCY } from './utils'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

const CURRENCY = STORE_CURRENCY

function fbq(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq(...args)
}

/** Événement de base, déclenché à chaque changement de page. */
export function trackPageView(): void {
  fbq('track', 'PageView')
}

/** Fiche produit consultée. */
export function trackViewContent({ id, name, value }: { id: string; name: string; value: number }) {
  fbq('track', 'ViewContent', {
    content_ids: [id],
    content_name: name,
    content_type: 'product',
    value,
    currency: CURRENCY,
  })
}

/** Ajout au panier. */
export function trackAddToCart({ id, name, value }: { id: string; name: string; value: number }) {
  fbq('track', 'AddToCart', {
    content_ids: [id],
    content_name: name,
    content_type: 'product',
    value,
    currency: CURRENCY,
  })
}

/** Ouverture du tunnel de commande. */
export function trackInitiateCheckout({
  value,
  contentIds,
  numItems,
}: {
  value: number
  contentIds: string[]
  numItems: number
}) {
  fbq('track', 'InitiateCheckout', {
    content_ids: contentIds,
    content_type: 'product',
    num_items: numItems,
    value,
    currency: CURRENCY,
  })
}

/**
 * Commande confirmée.
 *
 * `orderId` sert d'`eventID` : Meta déduplique les doublons (rechargement de
 * page, double rendu) tant que le même identifiant est réutilisé.
 */
export function trackPurchase({
  value,
  orderId,
  contentIds,
  numItems,
}: {
  value: number
  orderId: string
  contentIds: string[]
  numItems: number
}) {
  fbq(
    'track',
    'Purchase',
    {
      content_ids: contentIds,
      content_type: 'product',
      num_items: numItems,
      value,
      currency: CURRENCY,
    },
    { eventID: orderId },
  )
}
/**
 * Consentement cookies RGPD, persisté dans `localStorage`.
 *
 * Un petit pub/sub maison (événement `window`) permet à la bannière et au
 * pixel de rester synchronisés sans état global partagé.
 */

export type ConsentValue = 'accepted' | 'declined'

const STORAGE_KEY = 'q2m-consent'
const CHANGE_EVENT = 'q2m-consent-change'

/** Consentement courant, ou `null` tant que l'utilisateur n'a pas choisi. */
export function getConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

/** Enregistre le choix puis notifie les abonnés. */
export function setConsent(value: ConsentValue): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* stockage indisponible (mode privé) : on notifie quand même */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** S'abonne aux changements de consentement ; renvoie la fonction de cleanup. */
export function subscribeConsent(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}
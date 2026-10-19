'use client'

import { useEffect } from 'react'

/**
 * Enregistre le service worker (notifications push + app installable).
 * Exécuté côté client uniquement, une seule fois au montage.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* échec silencieux : la boutique reste fonctionnelle sans push */
    })
  }, [])

  return null
}

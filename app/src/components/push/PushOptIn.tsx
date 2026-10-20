'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import {
  removePushSubscription,
  savePushSubscription,
} from '@/app/actions/push'

/**
 * Bouton d'activation des notifications push dans le dashboard admin.
 *
 * Enregistre le service worker, s'abonne via la Push API avec la clé VAPID
 * publique, et persiste l'abonnement côté serveur. L'abonné reçoit ensuite
 * une alerte sur son téléphone (app installée en raccourci) à chaque
 * nouvelle commande.
 */

type State = 'unsupported' | 'default' | 'granted' | 'denied'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js')
}

export default function PushOptIn() {
  const [state, setState] = useState<State>('default')
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      // Sonde de capacite : differee d'un tick pour ne pas cascade de rendus
      // depuis le corps de l'effet (react-hooks/set-state-in-effect).
      queueMicrotask(() => setState('unsupported'))
      return
    }

    navigator.serviceWorker.ready.then((reg) => {
      setState(Notification.permission as State)
      return reg.pushManager.getSubscription().then((sub) => setActive(Boolean(sub)))
    })
  }, [])

  const enable = useCallback(async () => {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!key) return

    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      setState(permission as State)
      if (permission !== 'granted') return

      const reg = await getRegistration()
      if (!reg) return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })

      await savePushSubscription(sub.toJSON())
      setActive(true)
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setActive(false)
    } finally {
      setBusy(false)
    }
  }, [])

  if (state === 'unsupported') return null

  if (state === 'denied') {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
      >
        <BellOff className="h-4 w-4" />
        Notifications bloquées par le navigateur
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => (active ? disable() : enable())}
      disabled={busy}
      aria-pressed={active}
      className={
        active
          ? 'inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400'
          : 'inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent'
      }
    >
      <Bell className="h-4 w-4" />
      {active ? 'Notifications activées' : 'Activer les notifications'}
    </button>
  )
}

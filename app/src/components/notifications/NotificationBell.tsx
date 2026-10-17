'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'
import { getBrowserInsforge } from '@/lib/insforge-browser'
import {
  markAllNotificationsReadAction,
  markNotificationsReadAction,
} from '@/app/actions/notifications'
import {
  notificationChannel,
  shortOrderId,
  type NotificationDTO,
} from '@/lib/notifications-types'

interface NotificationBellProps {
  userId: string | null
  initialNotifications: NotificationDTO[]
}

/**
 * Cloche de notifications : liste persistee (fournie par le serveur) + mises a
 * jour temps reel via le canal personnel `user:<id>:notifications`. Affichee a
 * l'identique dans la navbar vitrine et la topbar admin (les deux sont sur le
 * chrome noir fixe).
 */
export function NotificationBell({ userId, initialNotifications }: NotificationBellProps) {
  const t = useTranslations('notifications')
  const td = useTranslations('dashboard')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationDTO[]>(initialNotifications)
  const containerRef = useRef<HTMLDivElement>(null)

  const channel = useMemo(() => (userId ? notificationChannel(userId) : null), [userId])
  const unread = items.filter((item) => !item.readAt).length

  const format = useCallback(
    (n: NotificationDTO): string => {
      const order = shortOrderId(n.orderId)
      const payload = n.payload ?? {}
      const name = typeof payload.name === 'string' ? payload.name : ''
      const status = typeof payload.status === 'string' ? payload.status : ''
      const rating = String(payload.rating ?? '')

      switch (n.kind) {
        case 'order_created':
          return t('order_created', { order })
        case 'order_confirmation':
          return t('order_confirmation', { order })
        case 'order_status_changed':
          return t('order_status_changed', { order, status: td(`orderStatus_${status}`) })
        case 'contact_message':
          return t('contact_message', { name })
        case 'product_review':
          return t('product_review', { rating })
        default:
          return n.title ?? t('generic')
      }
    },
    [t, td]
  )

  // Temps reel : abonnement au canal personnel de l'utilisateur connecte.
  useEffect(() => {
    if (!channel) return

    const client = getBrowserInsforge()
    let active = true

    const onNotification = (message: {
      meta?: { channel?: string }
      id?: string
      audience?: NotificationDTO['audience']
      kind?: string
      title?: string | null
      payload?: Record<string, unknown>
      href?: string | null
      orderId?: string | null
      createdAt?: string
    }) => {
      if (!active) return
      if (message?.meta?.channel && message.meta.channel !== channel) return
      if (!message?.id) return

      const dto: NotificationDTO = {
        id: message.id,
        audience: message.audience ?? 'CUSTOMER',
        kind: message.kind ?? 'generic',
        title: message.title ?? null,
        payload: message.payload ?? {},
        href: message.href ?? null,
        orderId: message.orderId ?? null,
        readAt: null,
        createdAt: message.createdAt ?? new Date().toISOString(),
      }

      setItems((prev) => (prev.some((n) => n.id === dto.id) ? prev : [dto, ...prev].slice(0, 50)))
      toast(format(dto))
    }

    const onError = (error: { message?: string }) => {
      // Non bloquant : la liste reste utilisable, seule la mise a jour live saute.
      console.error('realtime notifications:', error?.message ?? error)
    }

    client.realtime.on('notification', onNotification)
    client.realtime.on('error', onError)

    void client.realtime
      .connect()
      .then(() => client.realtime.subscribe(channel))
      .then((subscription) => {
        if (!subscription.ok) {
          console.error('realtime subscribe:', subscription.error?.message)
        }
      })
      .catch((error: unknown) => {
        console.error('realtime connect:', error)
      })

    return () => {
      active = false
      client.realtime.off('notification', onNotification)
      client.realtime.off('error', onError)
      void client.realtime.unsubscribe(channel)
    }
  }, [channel, format])

  // Fermeture au clic exterieur / a Echap.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const markRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n))
    )
    void markNotificationsReadAction([id]).catch(() => {})
  }, [])

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })))
    void markAllNotificationsReadAction().catch(() => {})
  }, [])

  if (!userId) return null

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={t('open')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--q2m-on-dark-soft)] transition-colors duration-180 ease-q2m hover:text-[var(--q2m-accent)] focus-visible:text-[var(--q2m-accent)]"
      >
        <Bell size={18} strokeWidth={1.5} />
        {unread > 0 && (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-black tabular-nums"
            style={{
              background: 'var(--q2m-accent)',
              color: 'var(--q2m-on-dark)',
              borderRadius: '999px',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute end-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden border border-white/10 bg-black text-[var(--q2m-on-dark)] shadow-2xl"
            style={{ borderRadius: 10 }}
            role="dialog"
            aria-label={t('title')}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.16em]">{t('title')}</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-medium text-[var(--q2m-accent)] transition-opacity hover:opacity-80"
                >
                  {t('markAllRead')}
                </button>
              )}
            </header>

            <div className="max-h-[22rem] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--q2m-on-dark-soft)]">
                  {t('empty')}
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {items.map((item) => {
                    const body = (
                      <div className="flex items-start gap-3">
                        {!item.readAt && (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                            style={{ background: 'var(--q2m-accent)' }}
                          />
                        )}
                        <div className={item.readAt ? 'ps-5' : ''}>
                          <p className="text-sm leading-snug">{format(item)}</p>
                          <p className="mt-1 text-[11px] text-[var(--q2m-on-dark-soft)]">
                            {new Intl.DateTimeFormat(locale, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(item.createdAt))}
                          </p>
                        </div>
                      </div>
                    )

                    const className =
                      'block px-4 py-3 transition-colors hover:bg-white/5 ' +
                      (item.readAt ? 'opacity-70' : '')

                    return (
                      <li key={item.id}>
                        {item.href ? (
                          <Link
                            href={item.href}
                            className={className}
                            onClick={() => {
                              markRead(item.id)
                              setOpen(false)
                            }}
                          >
                            {body}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className={'w-full text-start ' + className}
                            onClick={() => markRead(item.id)}
                          >
                            {body}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell

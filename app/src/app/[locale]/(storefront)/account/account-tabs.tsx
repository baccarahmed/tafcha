'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Heart, LayoutGrid, Package, ShoppingBag, User as UserIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { signOut } from '@/app/actions/auth'
import { formatCurrency } from '@/lib/utils'
import { getBrowserInsforge } from '@/lib/insforge-browser'
import { useWishlistStore } from '@/store/wishlist-store'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'
import type { CustomerOrder } from '@/lib/customer-orders'
import SiteSpeedPanel from './site-speed-panel'

interface AccountUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: 'ADMIN' | 'CUSTOMER'
}

interface AccountTabsProps {
  user: AccountUser
  orders: CustomerOrder[]
  locale: string
}

type TabKey = 'overview' | 'orders' | 'profile'

const TABS: Array<{ key: TabKey; icon: typeof LayoutGrid }> = [
  { key: 'overview', icon: LayoutGrid },
  { key: 'orders', icon: ShoppingBag },
  { key: 'profile', icon: UserIcon },
]

const TIMELINE = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const

function formatDate(iso: string, locale: string, withTime = false): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(new Date(iso))
}

/** Suivi : historique reel des transitions, sinon progression derivee du statut. */
function OrderTimeline({
  order,
  label,
  historyTitle,
  historyEmpty,
  locale,
}: {
  order: CustomerOrder
  label: (status: string) => string
  historyTitle: string
  historyEmpty: string
  locale: string
}) {
  if (order.events.length > 0) {
    return (
      <div className="mt-3">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
          {historyTitle}
        </p>
        <ol className="space-y-2">
          {order.events.map((event, index) => (
            <li key={`${event.status}-${event.createdAt}-${index}`} className="flex items-center gap-3">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: Q2M.accent }}
              />
              <span className="text-xs text-ink">{label(event.status)}</span>
              <span className="ms-auto text-[11px] text-ink-stone">
                {formatDate(event.createdAt, locale, true)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  if (order.events.length === 0 && order.status === 'CANCELLED') {
    return (
      <p className="mt-3 text-xs text-ink-mute">{historyTitle} · {label('CANCELLED')}</p>
    )
  }

  return (
    <div className="mt-4">
      <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-mute">
        {historyTitle}
      </p>
      <ol className="flex items-center gap-2">
        {TIMELINE.map((step) => {
          const reached = TIMELINE.indexOf(order.status as (typeof TIMELINE)[number]) >= TIMELINE.indexOf(step)
          return (
            <li key={step} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className="h-1.5 w-full rounded-full"
                style={{ background: reached ? Q2M.accent : Q2M.line }}
              />
              <span className={`text-[10px] ${reached ? 'text-ink' : 'text-ink-stone'}`}>
                {label(step)}
              </span>
            </li>
          )
        })}
      </ol>
      <span className="sr-only">{historyEmpty}</span>
    </div>
  )
}

function OrderCard({
  order,
  locale,
  labels,
}: {
  order: CustomerOrder
  locale: string
  labels: {
    orderNumber: string
    orderPlacedOn: string
    orderTotal: string
    deliveryEstimated: string
    historyTitle: string
    historyEmpty: string
    status: (status: string) => string
  }
}) {
  return (
    <article className="border border-line">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <p className="text-sm font-bold">
            {labels.orderNumber} #{order.shortId}
          </p>
          <p className="mt-0.5 text-xs text-ink-mute">
            {labels.orderPlacedOn} {formatDate(order.createdAt, locale)}
          </p>
        </div>
        <span className="border border-[var(--q2m-line-strong)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]">
          {labels.status(order.status)}
        </span>
      </header>

      <ul className="divide-y divide-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 px-6 py-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-[var(--q2m-bone)]">
              {item.image && (
                <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="mt-0.5 text-xs text-ink-mute">
                {[item.colorway, item.size ? `EU ${item.size}` : null, `×${item.quantity}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <span className="text-sm font-medium tabular-nums">
              {formatCurrency(item.price * item.quantity, locale)}
            </span>
          </li>
        ))}
      </ul>

      <footer className="border-t border-line px-6 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-mute">{labels.orderTotal}</span>
          <span className="font-bold tabular-nums">{formatCurrency(order.total, locale)}</span>
        </div>

        {order.deliveryWindowStart && (
          <p className="mt-2 text-xs text-ink-mute">
            {labels.deliveryEstimated} : {order.deliveryWindowStart}
            {order.deliveryWindowEnd ? ` → ${order.deliveryWindowEnd}` : ''}
          </p>
        )}

        <OrderTimeline
          order={order}
          label={labels.status}
          historyTitle={labels.historyTitle}
          historyEmpty={labels.historyEmpty}
          locale={locale}
        />
      </footer>
    </article>
  )
}

export function AccountTabs({ user, orders, locale }: AccountTabsProps) {
  const t = useTranslations('account')
  const td = useTranslations('dashboard')
  const [tab, setTab] = useState<TabKey>('overview')
  const [ordersState, setOrdersState] = useState<CustomerOrder[]>(orders)
  const favoritesCount = useWishlistStore((state) => state.items.length)

  // Suivi live : chaque commande possede son canal `order:<id>` ; un changement
  // de statut cote admin met a jour la carte sans rechargement.
  const orderIdsKey = orders.map((order) => order.id).join(',')
  useEffect(() => {
    if (!user.id || !orderIdsKey) return

    const client = getBrowserInsforge()
    const channels = orderIdsKey.split(',').map((id) => `order:${id}`)
    let active = true

    const onStatus = (message: { id?: string; status?: string; updatedAt?: string }) => {
      if (!active || !message?.id || !message.status) return
      const { id, status } = message
      const createdAt = message.updatedAt ?? new Date().toISOString()
      setOrdersState((prev) =>
        prev.map((order) =>
          order.id === id
            ? {
                ...order,
                status,
                events: order.events.some(
                  (event) => event.status === status && event.createdAt === createdAt
                )
                  ? order.events
                  : [...order.events, { status, note: null, createdAt }],
              }
            : order
        )
      )
    }

    client.realtime.on('status_changed', onStatus)
    void client.realtime
      .connect()
      .then(() => Promise.all(channels.map((channel) => client.realtime.subscribe(channel))))
      .catch((error: unknown) => console.error('realtime orders:', error))

    return () => {
      active = false
      client.realtime.off('status_changed', onStatus)
      channels.forEach((channel) => void client.realtime.unsubscribe(channel))
    }
  }, [user.id, orderIdsKey])

  const activeOrders = ordersState.filter((order) =>
    ['PENDING', 'PROCESSING', 'SHIPPED'].includes(order.status)
  )
  const latestOrder = ordersState[0] ?? null

  const orderLabels = {
    orderNumber: t('orderNumber'),
    orderPlacedOn: t('orderPlacedOn'),
    orderTotal: t('orderTotal'),
    deliveryEstimated: t('deliveryEstimated'),
    historyTitle: t('orderTimeline'),
    historyEmpty: t('historyEmpty'),
    status: (status: string) => String(td(`orderStatus_${status}`)),
  }

  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-5 pt-24 pb-10 sm:px-10 lg:px-14">
        <p className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-accent">
          {t('kicker')}
        </p>
        <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.02em] md:text-7xl">
          {user.firstName ?? user.email}
        </h1>
        <p className="mt-6 text-sm text-ink-mute">
          {t('signedInAs')} {user.email}
        </p>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-24 sm:px-10 lg:px-14">
        {/* Onglets + raccourci favoris */}
        <div className="mb-10 flex flex-wrap items-center gap-2 border-b border-line">
          {TABS.map(({ key, icon: Icon }) => {
            const active = key === tab
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`relative flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  active ? 'text-ink' : 'text-ink-mute hover:text-ink-soft'
                }`}
              >
                <Icon size={15} strokeWidth={1.75} />
                {t(`tab${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                {active && (
                  <motion.span
                    layoutId="account-tab"
                    className="absolute inset-x-2 -bottom-px h-0.5"
                    style={{ background: Q2M.accent }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            )
          })}

          <Link
            href="/favorites"
            className="ms-auto flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-mute transition-colors hover:text-accent"
          >
            <Heart size={15} strokeWidth={1.75} />
            {t('favoritesLink')}
            {favoritesCount > 0 && (
              <span className="tabular-nums text-accent">({favoritesCount})</span>
            )}
          </Link>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'overview' && (
              <div className="space-y-10">
                <p className="max-w-xl text-sm text-ink-soft">{t('overviewLead')}</p>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { icon: ShoppingBag, value: orders.length, label: t('statOrders') },
                    { icon: Package, value: activeOrders.length, label: t('statActive') },
                    { icon: Heart, value: favoritesCount, label: t('statFavorites') },
                  ].map((stat) => (
                    <div key={stat.label} className="border border-line px-6 py-5">
                      <stat.icon size={18} strokeWidth={1.5} className="text-accent" />
                      <p className="mt-3 text-3xl font-black tabular-nums">{stat.value}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink-mute">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-bold">{t('latestOrder')}</h2>
                  {latestOrder ? (
                    <div className="max-w-2xl">
                      <OrderCard order={latestOrder} locale={locale} labels={orderLabels} />
                    </div>
                  ) : (
                    <div className="max-w-2xl border border-line px-6 py-6 text-sm text-ink-mute">
                      {t('ordersEmpty')}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Link href="/search" className="q2m-btn-primary">
                      {t('explore')}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div className="space-y-4">
                {ordersState.length === 0 ? (
                  <div className="max-w-2xl border border-line px-6 py-6 text-sm text-ink-mute">
                    {t('ordersEmpty')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ordersState.map((order) => (
                      <div key={order.id} className="max-w-2xl">
                        <OrderCard order={order} locale={locale} labels={orderLabels} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'profile' && (
              <div className="space-y-10">
                <div className="max-w-2xl border border-line">
                  <div className="border-b border-line px-6 py-4">
                    <h2 className="text-sm font-bold">{t('profile')}</h2>
                  </div>

                  <dl className="divide-y divide-line">
                    {[
                      { label: t('firstName'), value: user.firstName ?? t('notSet') },
                      { label: t('lastName'), value: user.lastName ?? t('notSet') },
                      { label: t('email'), value: user.email },
                      {
                        label: t('role'),
                        value: user.role === 'ADMIN' ? t('roleAdmin') : t('roleCustomer'),
                      },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 px-6 py-4">
                        <dt className="text-xs uppercase tracking-wider text-ink-mute">{row.label}</dt>
                        <dd className="text-sm font-medium text-ink">{row.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-5">
                    {user.role === 'ADMIN' && (
                      <Link href="/dashboard" className="q2m-btn-primary">
                        {t('dashboard')}
                      </Link>
                    )}

                    <form action={signOut}>
                      <input type="hidden" name="locale" value={locale} />
                      <button
                        type="submit"
                        className="border border-[var(--q2m-line)] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--q2m-ink-soft)] transition-colors hover:border-[var(--q2m-alert)] hover:text-[var(--q2m-alert)]"
                      >
                        {t('signOut')}
                      </button>
                    </form>
                  </div>
                </div>

                <SiteSpeedPanel />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  )
}

export default AccountTabs

import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { buildMetadata } from '@/lib/seo'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'
import { formatCurrency } from '@/lib/utils'
import { getSessionUser } from '@/lib/session'
import { getMyOrders } from '@/lib/customer-orders'
import { signOut } from '@/app/actions/auth'
import SiteSpeedPanel from './site-speed-panel'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string }>
}

/** Etapes de suivi d'une commande, dans l'ordre du cycle de vie. */
const TIMELINE = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })

  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/account',
    noIndex: true,
  })
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso))
}

/**
 * Suivi derive du statut courant.
 *
 * Il n'existe pas d'historique de transitions en base : la timeline montre donc
 * l'avancement suppose d'apres le statut, et non les dates reelles de chaque
 * etape. Une commande annulee sort de la timeline.
 */
function OrderTimeline({
  status,
  label,
}: {
  status: string
  label: (step: string) => string
}) {
  if (status === 'CANCELLED') {
    return (
      <span className="mt-3 inline-block border border-[var(--q2m-alert)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--q2m-alert)]">
        {label('CANCELLED')}
      </span>
    )
  }

  const current = TIMELINE.indexOf(status as (typeof TIMELINE)[number])

  return (
    <ol className="mt-4 space-y-2">
      {TIMELINE.map((step, index) => {
        const reached = current >= 0 && index <= current
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: reached ? Q2M.accent : Q2M.line }}
            />
            <span className={`text-xs ${reached ? 'text-ink' : 'text-ink-stone'}`}>
              {label(step)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default async function AccountPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('account')
  const td = await getTranslations('dashboard')
  const user = await getSessionUser().catch(() => null)
  const orders = user ? await getMyOrders(user.id).catch(() => []) : []

  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pt-24 pb-16 lg:px-14">
        <p className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-accent">
          {t('kicker')}
        </p>

        {user ? (
          <>
            <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.02em] md:text-7xl">
              {user.firstName ?? user.email}
            </h1>
            <p className="mt-6 text-sm text-ink-mute">
              {t('signedInAs')} {user.email}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.02em] md:text-7xl">
              {t('guestTitle')}
            </h1>
            <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">{t('guestLead')}</p>
          </>
        )}
      </section>

      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pb-24 lg:px-14">
        {user ? (
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

            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-bold">{t('ordersTitle')}</h2>
                {orders.length > 0 && (
                  <span className="text-xs text-ink-mute">{orders.length}</span>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="max-w-2xl border border-line px-6 py-6 text-sm text-ink-mute">
                  {t('ordersEmpty')}
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <article key={order.id} className="max-w-2xl border border-line">
                      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                        <div>
                          <p className="text-sm font-bold">
                            {t('orderNumber')} #{order.shortId}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-mute">
                            {t('orderPlacedOn')} {formatDate(order.createdAt, locale)}
                          </p>
                        </div>
                        <span className="border border-[var(--q2m-line-strong)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]">
                          {td(`orderStatus_${order.status}`)}
                        </span>
                      </header>

                      <ul className="divide-y divide-line">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-4 px-6 py-4">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-[var(--q2m-bone)]">
                              {item.image && (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{item.name}</p>
                              <p className="mt-0.5 text-xs text-ink-mute">
                                {[
                                  item.colorway,
                                  item.size ? `EU ${item.size}` : null,
                                  `×${item.quantity}`,
                                ]
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
                          <span className="text-ink-mute">{t('orderTotal')}</span>
                          <span className="font-bold tabular-nums">
                            {formatCurrency(order.total, locale)}
                          </span>
                        </div>

                        {order.deliveryWindowStart && (
                          <p className="mt-2 text-xs text-ink-mute">
                            {t('deliveryEstimated')} : {order.deliveryWindowStart}
                            {order.deliveryWindowEnd ? ` → ${order.deliveryWindowEnd}` : ''}
                          </p>
                        )}

                        <OrderTimeline
                          status={order.status}
                          label={(step) => td(`orderStatus_${step}`)}
                        />
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <SiteSpeedPanel />
          </div>
        ) : (
          <Link href="/login" className="q2m-btn-primary">
            {t('login')}
          </Link>
        )}
      </section>
    </main>
  )
}

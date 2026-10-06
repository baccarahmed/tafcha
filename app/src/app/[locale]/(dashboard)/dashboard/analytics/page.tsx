import { Suspense } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'
import { getAdminOverview } from '@/lib/admin-data'
import {
  countOrdersInPeriod,
  getSalesAnalytics,
  isSalesPeriod,
  SALES_PERIODS,
  type SalesPeriod,
} from '@/lib/admin-analytics'
import { formatCurrency } from '@/lib/utils'
import PeriodFilter from './period-filter'
import TopProducts from './top-products'

/** `useSearchParams` impose un Suspense sur toute page qui l'utilise. */
function PeriodFilterFallback() {
  return (
    <div className="h-11 w-80 animate-pulse rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bone)]" />
  )
}

export default async function DashboardAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const t = await getTranslations('dashboard')
  const locale = await getLocale()
  const money = (amount: number) => formatCurrency(amount, locale)
  const { period: rawPeriod } = await searchParams
  const period: SalesPeriod = isSalesPeriod(rawPeriod) ? rawPeriod : '1m'

  const [overview, analytics] = await Promise.all([
    getAdminOverview(),
    getSalesAnalytics(period),
  ])

  // Les compteurs des onglets ne chargent que les entetes de commande : le
  // classement, lui, reste calcule une seule fois pour la periode affichee.
  const counts = Object.fromEntries(
    await Promise.all(
      SALES_PERIODS.map(async (candidate) => [candidate, await countOrdersInPeriod(candidate)] as const)
    )
  ) as Record<SalesPeriod, number>

  const peak = Math.max(...analytics.series.map((point) => point.value), 1)
  const byStatus = Object.entries(overview.statusCounts)

  const cards = [
    { label: t('revenue'), value: money(analytics.summary.revenue) },
    { label: t('ordersCount'), value: String(analytics.summary.orderCount) },
    { label: t('unitsSoldTotal'), value: String(analytics.summary.unitsSold) },
    { label: t('averageBasket'), value: money(analytics.summary.averageBasket) },
  ]

  const periodLabel = t(
    period === '7d' ? 'period7d' : period === '1m' ? 'period1m' : 'period6m'
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <p className="text-sm text-[var(--q2m-ink-stone)]">{t('analyticsLead')}</p>

        <Suspense fallback={<PeriodFilterFallback />}>
          <PeriodFilter value={period} counts={counts} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-5"
          >
            <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--q2m-ink)]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <TopProducts rows={analytics.topProducts} periodLabel={periodLabel} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
          <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('revenuePeriod', { period: periodLabel })}
          </h2>

          {analytics.series.some((point) => point.value > 0) ? (
            <div className="mt-6">
              {/* La zone des barres a une hauteur fixe et les libelles sont
                  dans un bloc separe : melange les deux, la colonne n'a plus de
                  hauteur propre et la barre en pourcentage vaut zero. */}
              <div className="flex h-40 items-end gap-1">
                {analytics.series.map((point) => {
                  const height = Math.max((point.value / peak) * 100, 2)

                  return (
                    <div
                      key={point.key}
                      className="group flex h-full flex-1 items-end"
                      title={`${point.label}: ${money(point.value)}`}
                    >
                      <div
                        className="w-full rounded-t-sm bg-[var(--q2m-accent)] transition-opacity group-hover:opacity-80"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="mt-2 flex gap-1">
                {analytics.series.map((point, index) => {
                  // Un libelle sur quatre : au-dela, le texte se chevauche sur
                  // soi-meme et devient illisible.
                  const labelled =
                    analytics.series.length <= 8 || index % 4 === 0

                  return (
                    <div key={point.key} className="flex-1 text-center">
                      {labelled && (
                        <span className="text-[0.625rem] tabular-nums text-[var(--q2m-ink-stone)]">
                          {point.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-[var(--q2m-ink-stone)]">
              {t('noRevenueData')}
            </p>
          )}
        </div>

        <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
          <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('ordersByStatus')}
          </h2>

          {byStatus.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {byStatus.map(([status, count]) => (
                <li key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--q2m-ink-soft)]">{status}</span>
                    <span className="tabular-nums text-[var(--q2m-ink)]">{count}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-[var(--q2m-bone)]">
                    <div
                      className="h-1 rounded-full bg-[var(--q2m-accent)]"
                      style={{
                        width: `${(count / overview.orderCount) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--q2m-ink-stone)]">{t('noStatus')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
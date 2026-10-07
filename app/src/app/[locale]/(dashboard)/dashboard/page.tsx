import { getLocale, getTranslations } from 'next-intl/server'
import { AlertTriangle, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react'
import { getAdminOverview } from '@/lib/admin-data'
import { formatCurrency } from '@/lib/utils'

export default async function DashboardOverviewPage() {
  const t = await getTranslations('dashboard')
  const locale = await getLocale()
  const money = (amount: number) => formatCurrency(amount, locale)
  const overview = await getAdminOverview()

  const peak = Math.max(...overview.revenueSeries.map((point) => point.value), 1)

  const cards = [
    {
      label: t('revenue'),
      value: money(overview.revenue),
      icon: TrendingUp,
    },
    {
      label: t('ordersCount'),
      value: String(overview.orderCount),
      icon: ShoppingCart,
    },
    {
      label: t('customers'),
      value: `${overview.customerCount} · ${overview.adminCount} ${t('admins')}`,
      icon: Users,
    },
    {
      label: t('lowStock'),
      value: String(overview.lowStock),
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]">
                {card.label}
              </p>
              <card.icon className="h-4 w-4 text-[var(--q2m-accent-text)]" />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--q2m-ink)]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('last14Days')}
          </h2>

          {overview.revenueSeries.some((point) => point.value > 0) ? (
            <div className="mt-6 flex h-40 items-end gap-1">
              {overview.revenueSeries.map((point) => (
                <div key={point.label} className="group flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-sm bg-[var(--q2m-accent)] transition-opacity group-hover:opacity-80"
                    style={{
                      height: `${Math.max((point.value / peak) * 100, 2)}%`,
                    }}
                    title={`${point.label}: ${money(point.value)}`}
                  />
                  <span className="text-[0.625rem] tabular-nums text-[var(--q2m-ink-stone)]">
                    {point.label}
                  </span>
                </div>
              ))}
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

          {Object.keys(overview.statusCounts).length > 0 ? (
            <ul className="mt-4 space-y-2">
              {Object.entries(overview.statusCounts).map(([status, count]) => (
                <li
                  key={status}
                  className="flex items-center justify-between border-b border-[var(--q2m-line-soft)] pb-2 last:border-b-0"
                >
                  <span className="text-sm text-[var(--q2m-ink-soft)]">{status}</span>
                  <span className="text-sm tabular-nums text-[var(--q2m-ink)]">{count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--q2m-ink-stone)]">{t('noStatus')}</p>
          )}

          <div className="mt-6 border-t border-[var(--q2m-line-soft)] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--q2m-ink-soft)]">
                {t('products')}
              </span>
              <span className="text-sm tabular-nums text-[var(--q2m-ink)]">
                {overview.productCount}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[var(--q2m-ink-soft)]">
                <Package className="h-3.5 w-3.5 text-[var(--q2m-ink-stone)]" />
                {t('visible')}
              </span>
              <span className="text-sm tabular-nums text-[var(--q2m-ink)]">
                {overview.activeProducts}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
          <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('recentOrders')}
          </h2>

          {overview.recentOrders.length > 0 ? (
            <ul className="mt-4 divide-y divide-[var(--q2m-line-soft)]">
              {overview.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-[var(--q2m-ink)]">
                      {order.customerEmail ?? t('customer')}
                    </span>
                    <span className="block text-xs tabular-nums text-[var(--q2m-ink-stone)]">
                      {order.shortId}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--q2m-ink-soft)]">
                    {money(order.total)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--q2m-ink-stone)]">{t('noOrders')}</p>
          )}
        </div>

        <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
          <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('recentUsers')}
          </h2>

          {overview.recentUsers.length > 0 ? (
            <ul className="mt-4 divide-y divide-[var(--q2m-line-soft)]">
              {overview.recentUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-[var(--q2m-ink)]">
                      {user.name || user.email}
                    </span>
                    <span className="block truncate text-xs text-[var(--q2m-ink-stone)]">
                      {user.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs uppercase tracking-wider text-[var(--q2m-ink-stone)]">
                    {user.role}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--q2m-ink-stone)]">{t('noUsers')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

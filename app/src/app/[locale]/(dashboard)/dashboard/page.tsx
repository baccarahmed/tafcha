import { getLocale, getTranslations } from 'next-intl/server'
import { AlertTriangle, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react'
import { getAdminOverview } from '@/lib/admin-data'
import { formatCurrency } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

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

  const productShare =
    overview.productCount > 0
      ? Math.round((overview.activeProducts / overview.productCount) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex-row items-center justify-between">
              <CardDescription className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em]">
                {card.label}
              </CardDescription>
              <card.icon className="h-4 w-4 text-[var(--q2m-accent-text)]" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-[var(--q2m-ink)]">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t('last14Days')}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.revenueSeries.some((point) => point.value > 0) ? (
              <div className="flex h-40 items-end gap-1">
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
              <p className="text-sm text-[var(--q2m-ink-stone)]">{t('noRevenueData')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t('ordersByStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(overview.statusCounts).length > 0 ? (
              <ul className="space-y-1">
                {Object.entries(overview.statusCounts).map(([status, count]) => (
                  <li
                    key={status}
                    className="flex items-center justify-between rounded-sm px-1 py-1.5"
                  >
                    <span className="text-sm text-[var(--q2m-ink-soft)]">{status}</span>
                    <span className="text-sm tabular-nums text-[var(--q2m-ink)]">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--q2m-ink-stone)]">{t('noStatus')}</p>
            )}

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--q2m-ink-soft)]">{t('products')}</span>
                <span className="text-sm tabular-nums text-[var(--q2m-ink)]">
                  {overview.productCount}
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[var(--q2m-ink-soft)]">
                    <Package className="h-3.5 w-3.5 text-[var(--q2m-ink-stone)]" />
                    {t('visible')}
                  </span>
                  <span className="tabular-nums text-[var(--q2m-ink)]">
                    {overview.activeProducts}
                  </span>
                </div>
                <Progress value={productShare} className="mt-2 h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t('recentOrders')}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentOrders.length > 0 ? (
              <ul className="divide-y divide-[var(--q2m-line-soft)]">
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
              <p className="text-sm text-[var(--q2m-ink-stone)]">{t('noOrders')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t('recentUsers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentUsers.length > 0 ? (
              <ul className="divide-y divide-[var(--q2m-line-soft)]">
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
              <p className="text-sm text-[var(--q2m-ink-stone)]">{t('noUsers')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
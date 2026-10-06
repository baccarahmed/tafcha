import { getLocale, getTranslations } from 'next-intl/server'
import { getAdminOrders } from '@/lib/admin-data'
import { formatCurrency } from '@/lib/utils'
import OrderControls from './order-controls'

export default async function DashboardOrdersPage() {
  const t = await getTranslations('dashboard')
  const locale = await getLocale()
  const money = (amount: number) => formatCurrency(amount, locale)
  const orders = await getAdminOrders()

  // Le chiffre d'affaires ne retient que les commandes livrees ou en cours et
  // les paiements encaisses : une commande annulee ou remboursee ne constitue
  // pas un revenu.
  const revenue = orders
    .filter(
      (order) =>
        order.status !== 'CANCELLED' &&
        order.paymentStatus !== 'FAILED' &&
        order.paymentStatus !== 'REFUNDED'
    )
    .reduce((sum, order) => sum + order.total, 0)

  const cards = [
    { label: t('ordersCount'), value: String(orders.length) },
    { label: t('revenue'), value: money(revenue) },
    {
      label: t('pendingOrders'),
      value: String(
        orders.filter(
          (order) =>
            order.status === 'PENDING' || order.status === 'PROCESSING'
        ).length
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-[var(--q2m-line-soft)]">
                {[
                  t('orderRef'),
                  t('customerCol'),
                  t('date'),
                  t('status'),
                  t('total'),
                  '',
                ].map((heading, index) => (
                  <th
                    key={heading || index}
                    className={`px-2 py-3 text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)] ${
                      index === 4 ? 'text-end' : 'text-start'
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[var(--q2m-line-soft)] last:border-b-0"
                >
                  <td className="whitespace-nowrap px-2 py-3.5 text-xs tabular-nums text-[var(--q2m-ink-mute)]">
                    {order.shortId}
                  </td>
                  <td className="px-2 py-3.5 text-sm text-[var(--q2m-ink)]">
                    {order.customerEmail ?? t('customer')}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3.5 text-xs tabular-nums text-[var(--q2m-ink-mute)]">
                    {order.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-2 py-3.5">
                    <span className="block text-xs text-[var(--q2m-ink-stone)]">
                      {order.status
                        ? t(`orderStatus_${order.status}`)
                        : '—'}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-end text-sm font-semibold tabular-nums text-[var(--q2m-ink)]">
                    {money(order.total)}
                  </td>
                  <td className="px-2 py-3.5">
                    <OrderControls
                      orderId={order.id}
                      status={order.status}
                      paymentStatus={order.paymentStatus}
                      customerEmail={order.customerEmail}
                      items={order.items}
                      total={order.total}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
            {t('noOrdersYet')}
          </p>
        )}
      </div>
    </div>
  )
}
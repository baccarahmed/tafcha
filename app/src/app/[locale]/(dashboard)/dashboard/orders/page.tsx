import { getLocale, getTranslations } from 'next-intl/server'
import { getAdminOrders } from '@/lib/admin-data'
import { formatCurrency } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
          <Card key={card.label}>
            <CardHeader className="flex-row items-center justify-between">
              <CardDescription className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em]">
                {card.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-[var(--q2m-ink)]">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t('ordersCount')}</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('orderRef')}</TableHead>
                    <TableHead>{t('customerCol')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-end">{t('total')}</TableHead>
                    <TableHead className="text-end">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-[var(--q2m-ink-mute)]">
                        {order.shortId}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--q2m-ink)]">
                        {order.customerEmail ?? t('customer')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums text-[var(--q2m-ink-mute)]">
                        {order.createdAt.slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--q2m-ink-stone)]">
                        {order.status ? t(`orderStatus_${order.status}`) : '—'}
                      </TableCell>
                      <TableCell className="text-end text-sm font-semibold tabular-nums text-[var(--q2m-ink)]">
                        {money(order.total)}
                      </TableCell>
                      <TableCell className="text-end">
                        <OrderControls
                          orderId={order.id}
                          status={order.status}
                          paymentStatus={order.paymentStatus}
                          customerEmail={order.customerEmail}
                          shippingAddress={order.shippingAddress}
                          items={order.items}
                          total={order.total}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
              {t('noOrdersYet')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
import { getLocale, getTranslations } from 'next-intl/server'
import { getAdminProducts } from '@/lib/admin-data'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default async function DashboardDropsPage() {
  const t = await getTranslations('dashboard')
  const locale = await getLocale()
  const money = (amount: number) => formatCurrency(amount, locale)
  const products = await getAdminProducts()

  const drops = products
    .filter((product) => product.isNewDrop)
    .sort((a, b) => (a.dropEndsAt ?? a.releaseDate ?? '').localeCompare(b.dropEndsAt ?? b.releaseDate ?? ''))

  return (
    <Card className="border-[var(--q2m-line-soft)]">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-[var(--q2m-ink)]">
          {t('drops')}
        </CardTitle>
        <p className="text-xs text-[var(--q2m-ink-stone)]">{t('dropsHint')}</p>
      </CardHeader>

      <CardContent>
        {drops.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
            {t('noDrops')}
          </p>
        ) : (
          <ul className="space-y-3">
            {drops.map((product) => (
              <li
                key={product.id}
                className="flex flex-col gap-2 border-b border-[var(--q2m-line-soft)] pb-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--q2m-ink)]">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--q2m-ink-stone)]">
                    {product.brand} · {money(product.price)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--q2m-ink-mute)]">
                    {t('dropsDates', {
                      release: product.releaseDate ?? '—',
                      ends: product.dropEndsAt ?? '—',
                    })}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    'uppercase',
                    product.isActive
                      ? 'border-[var(--q2m-accent)] bg-[var(--q2m-accent)]/10 text-[var(--q2m-accent-text)]'
                      : 'border-[var(--q2m-line-strong)] text-[var(--q2m-ink-mute)]'
                  )}
                >
                  {product.isActive ? t('drops') : t('draft')}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
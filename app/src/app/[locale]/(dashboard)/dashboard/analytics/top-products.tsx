import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Trophy } from 'lucide-react'
import SneakerVisual from '@/components/storefront/SneakerVisual'
import { formatCurrency } from '@/lib/utils'
import type { TopSoldProductRow } from '@/lib/admin-analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Classement des produits les plus vendus sur la periode choisie.
 *
 * Le tri se fait sur les unites vendues, pas sur le chiffre d'affaires : la
 * question « qu'est-ce qui part ? » est une question de volume, et une marge
 * elevee sur une paire vendue deux fois ne fait pas un best-seller.
 */
export default async function TopProducts({
  rows,
  periodLabel,
}: {
  rows: TopSoldProductRow[]
  periodLabel: string
}) {
  const t = await getTranslations('dashboard')
  const locale = await getLocale()
  const money = (amount: number) => formatCurrency(amount, locale)

  const peak = Math.max(...rows.map((row) => row.unitsSold), 1)

  return (
    <Card className="border-[var(--q2m-line-soft)]">
      <CardHeader className="flex-row items-center gap-3">
        <Trophy className="h-4 w-4 text-[var(--q2m-accent-text)]" />
        <CardTitle className="text-sm font-semibold text-[var(--q2m-ink)]">
          {t('topProducts')}
        </CardTitle>
        <span className="text-xs text-[var(--q2m-ink-stone)]">{periodLabel}</span>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--q2m-ink-stone)]">{t('noSalesYet')}</p>
        ) : (
          <ol className="space-y-5">
            {rows.map((row) => (
              <li key={row.productId} className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-[var(--q2m-ink-stone)]">
                    {row.rank}
                  </span>

                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-[var(--q2m-bone)]">
                    {row.coverImage ? (
                      <Image
                        src={row.coverImage}
                        alt={row.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <SneakerVisual variant="onyx" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${row.slug}`}
                      className="block truncate text-sm font-medium text-[var(--q2m-ink)] transition-colors hover:text-[var(--q2m-accent-text)]"
                    >
                      {row.name}
                    </Link>
                    <p className="truncate text-xs text-[var(--q2m-ink-stone)]">
                      {[row.brand, row.colorway, row.sku].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="shrink-0 text-end">
                    <p className="text-sm font-semibold tabular-nums text-[var(--q2m-ink)]">
                      {t('unitsSold', { count: row.unitsSold })}
                    </p>
                    <p className="text-xs tabular-nums text-[var(--q2m-ink-stone)]">
                      {money(row.revenue)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ps-8">
                  <div className="h-1 flex-1 rounded-full bg-[var(--q2m-bone)]">
                    <div
                      className="h-1 rounded-full bg-[var(--q2m-accent)]"
                      style={{ width: `${(row.unitsSold / peak) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-end text-[0.625rem] tabular-nums text-[var(--q2m-ink-stone)]">
                    {row.share.toFixed(0)}%
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
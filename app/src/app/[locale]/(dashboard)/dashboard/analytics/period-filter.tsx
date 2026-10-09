'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { SalesPeriod } from '@/lib/admin-analytics'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Selecteur de periode de l'analyse.
 *
 * La periode vit dans l'URL et non dans un etat React : la page reste un
 * Server Component, le filtre est partageable par lien, et le retour
 * navigateur restitue la periode affichee.
 */
export default function PeriodFilter({
  value,
  counts,
}: {
  value: SalesPeriod
  /** Nombre de commandes par periode, pour comparer d'un coup d'oeil. */
  counts: Record<SalesPeriod, number>
}) {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const options: Array<{ period: SalesPeriod; label: string }> = [
    { period: '7d', label: t('period7d') },
    { period: '1m', label: t('period1m') },
    { period: '6m', label: t('period6m') },
  ]

  function select(period: SalesPeriod) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('period', period)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <Tabs value={value} onValueChange={(period) => select(period as SalesPeriod)}>
      <TabsList>
        {options.map((option) => (
          <TabsTrigger key={option.period} value={option.period}>
            {option.label}
            <span
              className={cn(
                'ms-1.5 text-xs tabular-nums',
                option.period === value
                  ? 'text-[var(--q2m-accent-text)]'
                  : 'text-[var(--q2m-ink-stone)]'
              )}
            >
              {counts[option.period]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
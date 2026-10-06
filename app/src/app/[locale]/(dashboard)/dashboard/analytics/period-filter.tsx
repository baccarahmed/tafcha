'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { SalesPeriod } from '@/lib/admin-analytics'

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
    <div
      role="tablist"
      aria-label={t('topProductsPeriod')}
      className="inline-flex flex-wrap gap-1 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bone)] p-1"
    >
      {options.map((option) => {
        const active = option.period === value

        return (
          <button
            key={option.period}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(option.period)}
            className={cn(
              'rounded-sm px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-[var(--q2m-bg-elevated)] text-[var(--q2m-ink)] shadow-[var(--q2m-shadow-sm)]'
                : 'text-[var(--q2m-ink-mute)] hover:text-[var(--q2m-ink)]'
            )}
          >
            {option.label}
            <span className="ms-1.5 text-xs tabular-nums text-[var(--q2m-ink-stone)]">
              {counts[option.period]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
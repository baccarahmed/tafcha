'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { AlertCircle, Check, ChevronDown, X } from 'lucide-react'
import { updateOrderAction } from '@/app/actions/admin'
import { cn, formatCurrency } from '@/lib/utils'

const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const

/**
 * Pilotage du traitement d'une commande.
 *
 * Les deux listes reprennent exactement les valeurs autorisees par les CHECK du
 * schema : un statut hors enum ne serait pas rejete par le navigateur mais
 * le serait par Postgres, plus tard et sans message exploitable.
 */
export default function OrderControls({
  orderId,
  status,
  paymentStatus,
  customerEmail,
  items,
  total,
}: {
  orderId: string
  status: string | null
  paymentStatus: string | null
  customerEmail: string | null
  items: { id: string; name: string; colorway: string | null; quantity: number; price: number }[]
  total: number
}) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function patch(next: { status?: string; paymentStatus?: string }) {
    setError(null)

    startTransition(async () => {
      const result = await updateOrderAction(orderId, next)

      if (!result.ok) {
        setError(result.field)
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <select
          value={status ?? ''}
          disabled={pending}
          onChange={(event) => patch({ status: event.target.value })}
          aria-label={t('status')}
          className={cn(
            'rounded-sm border px-2 py-1.5 text-xs font-medium uppercase tracking-wider outline-none',
            status === 'CANCELLED'
              ? 'border-[var(--q2m-alert)] bg-[var(--q2m-alert)]/10 text-[var(--q2m-alert)]'
              : 'border-[var(--q2m-line-strong)] bg-transparent text-[var(--q2m-ink-soft)]'
          )}
        >
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {t(`orderStatus_${option}`)}
            </option>
          ))}
        </select>

        <select
          value={paymentStatus ?? ''}
          disabled={pending}
          onChange={(event) => patch({ paymentStatus: event.target.value })}
          aria-label={t('paymentStatus')}
          className={cn(
            'rounded-sm border px-2 py-1.5 text-xs font-medium uppercase tracking-wider outline-none',
            paymentStatus === 'PAID'
              ? 'border-[var(--q2m-status-open)] bg-[var(--q2m-status-open-bg)] text-[var(--q2m-status-open)]'
              : paymentStatus === 'FAILED' || paymentStatus === 'REFUNDED'
                ? 'border-[var(--q2m-alert)] bg-[var(--q2m-alert)]/10 text-[var(--q2m-alert)]'
                : 'border-[var(--q2m-line-strong)] bg-transparent text-[var(--q2m-ink-soft)]'
          )}
        >
          {PAYMENT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {t(`paymentStatus_${option}`)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('orderDetail')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--q2m-line-soft)] text-[var(--q2m-ink-stone)] transition-colors hover:border-[var(--q2m-ink)] hover:text-[var(--q2m-ink)]"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {saved && (
          <span className="inline-flex items-center gap-1 text-[0.625rem] text-[var(--q2m-status-open)]">
            <Check className="h-3 w-3" />
          </span>
        )}

        {error && (
          <span className="inline-flex items-center gap-1 text-[0.625rem] text-[var(--q2m-alert)]">
            <AlertCircle className="h-3 w-3" />
          </span>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 md:p-8">
          <div className="w-full max-w-lg space-y-5 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--q2m-ink)]">
                  {t('orderDetail')}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--q2m-ink-stone)]">
                  {customerEmail ?? t('customer')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('closeForm')}
                className="p-1.5 text-[var(--q2m-ink-stone)] transition-colors hover:text-[var(--q2m-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-2 border-y border-[var(--q2m-line-soft)] py-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[var(--q2m-ink)]">
                      {item.name}
                    </span>
                    {item.colorway && (
                      <span className="block truncate text-xs text-[var(--q2m-ink-stone)]">
                        {item.colorway}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--q2m-ink-soft)]">
                    ×{item.quantity}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-[var(--q2m-ink)]">{t('total')}</span>
              <span className="tabular-nums text-[var(--q2m-ink)]">
                {formatCurrency(total, locale)}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
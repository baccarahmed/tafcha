'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { AlertCircle, Check, ChevronDown } from 'lucide-react'
import { updateOrderAction } from '@/app/actions/admin'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

  const statusTone = (value: string | null) => {
    if (value === 'PAID') return 'bg-[var(--q2m-status-open-bg)] text-[var(--q2m-status-open)]'
    if (value === 'FAILED' || value === 'REFUNDED' || value === 'CANCELLED')
      return 'bg-[var(--q2m-alert)]/10 text-[var(--q2m-alert)]'
    return 'text-[var(--q2m-ink-soft)]'
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Select
          value={status ?? undefined}
          disabled={pending}
          onValueChange={(value) => patch({ status: value })}
        >
          <SelectTrigger
            aria-label={t('status')}
            className={cn(
              'h-7 w-[7.5rem] border px-2 text-xs font-medium uppercase tracking-wider',
              statusTone(status)
            )}
          >
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`orderStatus_${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentStatus ?? undefined}
          disabled={pending}
          onValueChange={(value) => patch({ paymentStatus: value })}
        >
          <SelectTrigger
            aria-label={t('paymentStatus')}
            className={cn(
              'h-7 w-[7.5rem] border px-2 text-xs font-medium uppercase tracking-wider',
              statusTone(paymentStatus)
            )}
          >
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`paymentStatus_${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label={t('orderDetail')}
          className="h-7 w-7 text-[var(--q2m-ink-stone)]"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>

        {saved && (
          <Badge variant="outline" className="bg-transparent px-0 text-[var(--q2m-status-open)]">
            <Check className="h-3.5 w-3.5" />
          </Badge>
        )}

        {error && (
          <Badge variant="outline" className="bg-transparent px-0 text-[var(--q2m-alert)]">
            <AlertCircle className="h-3.5 w-3.5" />
          </Badge>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('orderDetail')}</DialogTitle>
            <DialogDescription>{customerEmail ?? t('customer')}</DialogDescription>
          </DialogHeader>

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
        </DialogContent>
      </Dialog>
    </>
  )
}
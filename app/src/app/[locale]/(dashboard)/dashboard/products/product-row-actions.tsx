'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, Star, Trash2, X } from 'lucide-react'
import {
  deleteProductAction,
  updateProductAction,
} from '@/app/actions/admin'
import { cn } from '@/lib/utils'

/**
 * Actions d'une fiche produit dans la liste du back-office.
 *
 * Les trois bascules (en ligne, mis en avant, nouveau drop) s'ecrivent
 * immediatement : ce sont des decisions d'exploitation prises en cours de
 * visite du catalogue. L'edition et la suppression, qui detruisent de
 * l'information, passent par une confirmation explicite.
 */
export default function ProductRowActions({
  productId,
  isActive,
  isFeatured,
  isNewDrop,
}: {
  productId: string
  isActive: boolean
  isFeatured: boolean
  isNewDrop: boolean
}) {
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(patch: { active?: boolean; featured?: boolean; isNewDrop?: boolean }) {
    setError(null)

    startTransition(async () => {
      const result = await updateProductAction(productId, patch)

      if (!result.ok) {
        setError(result.field)
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      router.refresh()
    })
  }

  function remove() {
    setError(null)

    startTransition(async () => {
      const result = await deleteProductAction(productId)

      if (!result.ok) {
        setError(result.field)
        return
      }

      setConfirming(false)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Toggle
        label={t('toggleActive')}
        active={isActive}
        disabled={pending}
        onClick={() => toggle({ active: !isActive })}
      />

      <Toggle
        label={t('toggleFeatured')}
        active={isFeatured}
        disabled={pending}
        onClick={() => toggle({ featured: !isFeatured })}
      >
        <Star className="h-3.5 w-3.5" />
      </Toggle>

      <Toggle
        label={t('toggleNewDrop')}
        active={isNewDrop}
        disabled={pending}
        onClick={() => toggle({ isNewDrop: !isNewDrop })}
      />

      {confirming ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            aria-label={t('confirmDeleteProduct')}
            className="inline-flex h-7 items-center gap-1 rounded-sm bg-[var(--q2m-alert)] px-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            {t('confirmYes')}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            aria-label={t('cancel')}
            className="inline-flex h-7 items-center rounded-sm border border-[var(--q2m-line-strong)] px-2 text-[var(--q2m-ink-mute)] transition-colors hover:text-[var(--q2m-ink)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          aria-label={t('deleteProduct')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--q2m-line-soft)] text-[var(--q2m-ink-stone)] transition-colors hover:border-[var(--q2m-alert)] hover:text-[var(--q2m-alert)] disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {saved && (
        <span className="inline-flex items-center gap-1 text-[0.625rem] text-[var(--q2m-status-open)]">
          <Check className="h-3 w-3" />
          {t('saved')}
        </span>
      )}

      {error && (
        <span className="inline-flex items-center gap-1 text-[0.625rem] text-[var(--q2m-alert)]">
          <AlertCircle className="h-3 w-3" />
          {t(`manageError_${error}`)}
        </span>
      )}
    </div>
  )
}

function Toggle({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-sm border px-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] transition-colors disabled:opacity-50',
        active
          ? 'border-[var(--q2m-status-open)] bg-[var(--q2m-status-open-bg)] text-[var(--q2m-status-open)]'
          : 'border-[var(--q2m-line-soft)] text-[var(--q2m-ink-stone)] hover:border-[var(--q2m-line-strong)] hover:text-[var(--q2m-ink)]'
      )}
    >
      {children ?? (active ? <Check className="h-3 w-3" /> : null)}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
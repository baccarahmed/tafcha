'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, CopyPlus, Star, Trash2 } from 'lucide-react'
import {
  deleteProductAction,
  duplicateProductAction,
  updateProductAction,
} from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  productName,
  isActive,
  isFeatured,
  isNewDrop,
}: {
  productId: string
  productName: string
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

  const [duplicating, setDuplicating] = useState(false)
  const [colorway, setColorway] = useState('')
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

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

  function duplicate() {
    setDuplicateError(null)

    startTransition(async () => {
      const result = await duplicateProductAction(productId, {
        colorway: colorway.trim() || undefined,
      })

      if (!result.ok) {
        setDuplicateError(result.field)
        return
      }

      setDuplicating(false)
      setColorway('')
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

      <Dialog
        open={duplicating}
        onOpenChange={(open) => {
          setDuplicating(open)
          if (!open) setDuplicateError(null)
        }}
      >
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={pending}
            aria-label={t('duplicateColor')}
            className="h-7 w-7 text-[var(--q2m-ink-stone)]"
          >
            <CopyPlus className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('duplicateColorTitle')}</DialogTitle>
            <p className="truncate text-xs text-[var(--q2m-ink-stone)]">{productName}</p>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void duplicate()
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor={`duplicate-color-${productId}`}>{t('fieldColorway')}</Label>
              <Input
                id={`duplicate-color-${productId}`}
                value={colorway}
                onChange={(event) => setColorway(event.target.value)}
                placeholder={t('duplicateColorPlaceholder')}
                className="border-[var(--q2m-line-soft)] focus-visible:ring-transparent"
              />
              <p className="mt-1.5 text-xs text-[var(--q2m-ink-stone)]">
                {t('duplicateColorHint')}
              </p>
            </div>

            {duplicateError && (
              <p className="inline-flex items-center gap-2 text-sm text-[var(--q2m-alert)]">
                <AlertCircle className="h-4 w-4" />
                {t(`manageError_${duplicateError}`)}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {t('duplicateColor')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={pending}
            aria-label={t('deleteProduct')}
            className="h-7 w-7 text-[var(--q2m-ink-stone)] hover:border-[var(--q2m-alert)] hover:text-[var(--q2m-alert)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProduct')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteProduct')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void remove()
              }}
              disabled={pending}
              className="bg-[var(--q2m-alert)] text-white hover:bg-[var(--q2m-alert)]"
            >
              {t('confirmYes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
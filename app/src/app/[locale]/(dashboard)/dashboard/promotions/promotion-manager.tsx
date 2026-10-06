'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import {
  deletePromotionAction,
  savePromotionAction,
  setPromotionActiveAction,
} from '@/app/actions/admin'
import { cn } from '@/lib/utils'

const inputClass =
  'q2m-input w-full px-3.5 py-2.5 text-sm text-[var(--q2m-ink)] placeholder:text-[var(--q2m-ink-stone)] outline-none'

const labelClass =
  'mb-2 block text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]'

const errorClass = 'mt-1.5 text-xs text-[var(--q2m-alert)]'

export interface EditablePromotion {
  id: string
  name: string
  description: string | null
  type: string | null
  percentage: number | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  targets: string[]
  announcementText: string | null
}

/** Date ISO courte pour un `<input type="date">`. */
function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : ''
}

export default function PromotionManager({
  promotions,
}: {
  promotions: EditablePromotion[]
}) {
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    router.refresh()
  }

  function toggleActive(id: string, active: boolean) {
    setError(null)

    startTransition(async () => {
      const result = await setPromotionActiveAction(id, active)

      if (!result.ok) {
        setError(result.field)
        return
      }

      flash()
    })
  }

  function remove(id: string) {
    setError(null)

    startTransition(async () => {
      const result = await deletePromotionAction(id)

      if (!result.ok) {
        setError(result.field)
        return
      }

      setConfirmingId(null)
      flash()
    })
  }

  function submit(promotion: EditablePromotion | null) {
    setError(null)

    const form = new FormData(
      document.getElementById(`promo-form-${promotion?.id ?? 'new'}`) as HTMLFormElement
    )

    startTransition(async () => {
      const result = await savePromotionAction(promotion?.id ?? null, {
        name: String(form.get('name') ?? ''),
        description: String(form.get('description') ?? ''),
        type: String(form.get('type') ?? 'PRODUCT') as 'PRODUCT' | 'CATEGORY',
        // Les cibles sont conservees telles quelles : `["*"]` cible tout le
        // catalogue. La selection de produits ou de categories n'a pas encore
        // d'interface, donc renvoyer une cible unique ecraserait silencieusement
        // une promotion aujourd'hui ciblee.
        targets: promotion?.targets ?? ['*'],
        percentage: Number(form.get('percentage') ?? 0),
        startDate: String(form.get('startDate') ?? ''),
        endDate: String(form.get('endDate') ?? ''),
        active: form.get('active') === 'on',
        announcementText: String(form.get('announcementText') ?? ''),
      })

      if (!result.ok) {
        setError(result.field)
        return
      }

      setEditingId(null)
      setCreating(false)
      flash()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--q2m-ink-stone)]">{t('promotionsLead')}</p>

        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true)
              setEditingId(null)
              setError(null)
            }}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--q2m-ink)] px-5 py-2.5 text-sm font-medium text-[var(--q2m-bg-elevated)] transition-opacity hover:opacity-85"
          >
            <Plus className="h-4 w-4" />
            {t('newPromotion')}
          </button>
        )}
      </div>

      {saved && (
        <p className="inline-flex items-center gap-2 text-sm text-[var(--q2m-status-open)]">
          <Check className="h-4 w-4" />
          {t('saved')}
        </p>
      )}

      {creating && (
        <PromotionForm
          formId="promo-form-new"
          onSubmit={() => submit(null)}
          onCancel={() => setCreating(false)}
          pending={pending}
          error={error}
        />
      )}

      <ul className="space-y-3">
        {promotions.map((promotion) =>
          editingId === promotion.id ? (
            <li key={promotion.id}>
              <PromotionForm
                formId={`promo-form-${promotion.id}`}
                promotion={promotion}
                onSubmit={() => submit(promotion)}
                onCancel={() => setEditingId(null)}
                pending={pending}
                error={error}
              />
            </li>
          ) : (
            <li
              key={promotion.id}
              className="flex flex-col gap-3 rounded-sm border border-[var(--q2m-line-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--q2m-ink)]">
                  {promotion.name}
                </p>
                {promotion.description && (
                  <p className="mt-0.5 truncate text-xs text-[var(--q2m-ink-stone)]">
                    {promotion.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--q2m-ink-mute)]">
                  {t(`promoType_${promotion.type ?? 'PRODUCT'}`)}
                  {promotion.percentage != null && ` · ${promotion.percentage}%`}
                  {promotion.startDate &&
                    ` · ${toDateInput(promotion.startDate)} → ${toDateInput(promotion.endDate)}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggleActive(promotion.id, !promotion.isActive)}
                  className={cn(
                    'inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] transition-colors disabled:opacity-50',
                    promotion.isActive
                      ? 'border-[var(--q2m-status-open)] bg-[var(--q2m-status-open-bg)] text-[var(--q2m-status-open)]'
                      : 'border-[var(--q2m-line-strong)] text-[var(--q2m-ink-mute)]'
                  )}
                >
                  {promotion.isActive ? t('active') : t('inactive')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingId(promotion.id)
                    setCreating(false)
                    setError(null)
                  }}
                  aria-label={t('editPromotion')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--q2m-line-soft)] text-[var(--q2m-ink-stone)] transition-colors hover:border-[var(--q2m-ink)] hover:text-[var(--q2m-ink)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

                {confirmingId === promotion.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(promotion.id)}
                      aria-label={t('confirmDeletePromotion')}
                      className="inline-flex h-7 items-center gap-1 rounded-sm bg-[var(--q2m-alert)] px-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('confirmYes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      aria-label={t('cancel')}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--q2m-line-strong)] text-[var(--q2m-ink-mute)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmingId(promotion.id)}
                    aria-label={t('deletePromotion')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--q2m-line-soft)] text-[var(--q2m-ink-stone)] transition-colors hover:border-[var(--q2m-alert)] hover:text-[var(--q2m-alert)] disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          )
        )}
      </ul>

      {promotions.length === 0 && !creating && (
        <p className="py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
          {t('noPromotions')}
        </p>
      )}
    </div>
  )
}

function PromotionForm({
  formId,
  promotion,
  onSubmit,
  onCancel,
  pending,
  error,
}: {
  formId: string
  promotion?: EditablePromotion
  onSubmit: () => void
  onCancel: () => void
  pending: boolean
  error: string | null
}) {
  const t = useTranslations('dashboard')

  const today = new Date().toISOString().slice(0, 10)
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-5 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bone)] p-5"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-name`} className={labelClass}>
            {t('fieldPromotionName')}
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            defaultValue={promotion?.name ?? ''}
            required
            className={inputClass}
          />
          {error === 'name' && <p className={errorClass}>{t('errorName')}</p>}
        </div>

        <div>
          <label htmlFor={`${formId}-type`} className={labelClass}>
            {t('fieldPromotionType')}
          </label>
          <select
            id={`${formId}-type`}
            name="type"
            defaultValue={promotion?.type ?? 'PRODUCT'}
            className={inputClass}
          >
            <option value="PRODUCT">{t('promoType_PRODUCT')}</option>
            <option value="CATEGORY">{t('promoType_CATEGORY')}</option>
          </select>
        </div>

        <div>
          <label htmlFor={`${formId}-percentage`} className={labelClass}>
            {t('fieldPromotionPercentage')}
          </label>
          <input
            id={`${formId}-percentage`}
            name="percentage"
            type="number"
            min={1}
            max={100}
            step="0.01"
            defaultValue={promotion?.percentage ?? 10}
            required
            className={inputClass}
          />
          {error === 'percentage' && (
            <p className={errorClass}>{t('errorPromotionPercentage')}</p>
          )}
        </div>

        <div>
          <label htmlFor={`${formId}-announcementText`} className={labelClass}>
            {t('fieldAnnouncementText')}
          </label>
          <input
            id={`${formId}-announcementText`}
            name="announcementText"
            defaultValue={promotion?.announcementText ?? ''}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-startDate`} className={labelClass}>
            {t('fieldStartDate')}
          </label>
          <input
            id={`${formId}-startDate`}
            name="startDate"
            type="date"
            defaultValue={toDateInput(promotion?.startDate ?? null) || today}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-endDate`} className={labelClass}>
            {t('fieldEndDate')}
          </label>
          <input
            id={`${formId}-endDate`}
            name="endDate"
            type="date"
            defaultValue={
              toDateInput(promotion?.endDate ?? null) ||
              nextMonth.toISOString().slice(0, 10)
            }
            required
            className={inputClass}
          />
          {error === 'dates' && <p className={errorClass}>{t('errorDates')}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${formId}-description`} className={labelClass}>
            {t('fieldPromotionDescription')}
          </label>
          <input
            id={`${formId}-description`}
            name="description"
            defaultValue={promotion?.description ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-4">
        <span className="text-sm font-medium text-[var(--q2m-ink)]">{t('active')}</span>
        <input
          type="checkbox"
          name="active"
          defaultChecked={promotion?.isActive ?? true}
          className="h-4 w-4 shrink-0 accent-[var(--q2m-accent)]"
        />
      </label>

      {error && !['name', 'percentage', 'dates'].includes(error) && (
        <p className="inline-flex items-center gap-2 text-sm text-[var(--q2m-alert)]">
          <AlertCircle className="h-4 w-4" />
          {t(`manageError_${error}`)}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm bg-[var(--q2m-ink)] px-5 py-2.5 text-sm font-medium text-[var(--q2m-bg-elevated)] transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {pending ? t('saving') : t('save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border border-[var(--q2m-line-strong)] px-5 py-2.5 text-sm font-medium text-[var(--q2m-ink-soft)] transition-colors hover:text-[var(--q2m-ink)]"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}
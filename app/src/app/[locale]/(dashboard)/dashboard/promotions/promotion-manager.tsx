'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, Check, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import {
  deletePromotionAction,
  savePromotionAction,
  setPromotionActiveAction,
} from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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

const fieldClass = 'border-[var(--q2m-line-soft)] focus-visible:ring-transparent'

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

export interface TargetOption {
  id: string
  name: string
}

/** Date ISO courte pour un `<input type="date">`. */
function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : ''
}

/**
 * Relit la liste de cibles serialisee dans le champ cache.
 *
 * `["*"]` cible tout le catalogue. Une valeur illisible retombe sur « tout »
 * plutot que de faire echouer silencieusement le formulaire.
 */
function parseTargets(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return ['*']
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return ['*']
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return ['*']
  }
}

export default function PromotionManager({
  promotions,
  products,
  categories,
}: {
  promotions: EditablePromotion[]
  products: TargetOption[]
  categories: TargetOption[]
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
        // La liste de cibles vient du selecteur : `["*"]` cible tout le
        // catalogue, sinon des identifiants de produits ou de categories.
        targets: parseTargets(form.get('targets')),
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
          <Button
            type="button"
            onClick={() => {
              setCreating(true)
              setEditingId(null)
              setError(null)
            }}
            className="gap-2 rounded-sm bg-[var(--q2m-ink)] text-[var(--q2m-bg-elevated)] hover:opacity-85"
          >
            <Plus className="h-4 w-4" />
            {t('newPromotion')}
          </Button>
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
          products={products}
          categories={categories}
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
                products={products}
                categories={categories}
                onSubmit={() => submit(promotion)}
                onCancel={() => setEditingId(null)}
                pending={pending}
                error={error}
              />
            </li>
          ) : (
            <li key={promotion.id}>
              <Card className="border-[var(--q2m-line-soft)]">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                      {promotion.targets.includes('*')
                        ? ` · ${t('promotionTargetsAll')}`
                        : ` · ${promotion.targets.length} ${t('fieldPromotionTargets')}`}
                      {promotion.startDate &&
                        ` · ${toDateInput(promotion.startDate)} → ${toDateInput(promotion.endDate)}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => toggleActive(promotion.id, !promotion.isActive)}
                      className="h-7"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          'uppercase',
                          promotion.isActive
                            ? 'border-[var(--q2m-status-open)] bg-[var(--q2m-status-open-bg)] text-[var(--q2m-status-open)]'
                            : 'border-[var(--q2m-line-strong)] text-[var(--q2m-ink-mute)]'
                        )}
                      >
                        {promotion.isActive ? t('active') : t('inactive')}
                      </Badge>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingId(promotion.id)
                        setCreating(false)
                        setError(null)
                      }}
                      aria-label={t('editPromotion')}
                      className="h-7 w-7 text-[var(--q2m-ink-stone)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <AlertDialog
                      open={confirmingId === promotion.id}
                      onOpenChange={(open) => setConfirmingId(open ? promotion.id : null)}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={pending}
                          aria-label={t('deletePromotion')}
                          className="h-7 w-7 text-[var(--q2m-ink-stone)] hover:border-[var(--q2m-alert)] hover:text-[var(--q2m-alert)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('deletePromotion')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('confirmDeletePromotion')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={pending}>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(event) => {
                              event.preventDefault()
                              void remove(promotion.id)
                            }}
                            disabled={pending}
                            className="bg-[var(--q2m-alert)] text-white hover:bg-[var(--q2m-alert)]"
                          >
                            {t('confirmYes')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
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
  products,
  categories,
  onSubmit,
  onCancel,
  pending,
  error,
}: {
  formId: string
  promotion?: EditablePromotion
  products: TargetOption[]
  categories: TargetOption[]
  onSubmit: () => void
  onCancel: () => void
  pending: boolean
  error: string | null
}) {
  const t = useTranslations('dashboard')

  const today = new Date().toISOString().slice(0, 10)
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  // Les controles Radix (Select, Switch) ne produisent pas de champ natif : on
  // les fait miroiter dans des inputs caches pour que le FormData lu dans
  // `submit()` retrouve `type` et `active`.
  const [type, setType] = useState(promotion?.type ?? 'PRODUCT')
  const [isActive, setIsActive] = useState(promotion?.isActive ?? true)
  const [targets, setTargets] = useState<string[]>(promotion?.targets ?? ['*'])

  const options = type === 'CATEGORY' ? categories : products
  const allTargets = targets.includes('*')

  function toggleTarget(id: string) {
    setTargets((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

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
          <Label htmlFor={`${formId}-name`}>{t('fieldPromotionName')}</Label>
          <Input
            id={`${formId}-name`}
            name="name"
            defaultValue={promotion?.name ?? ''}
            required
            className={fieldClass}
          />
          {error === 'name' && <p className={errorClass}>{t('errorName')}</p>}
        </div>

        <div>
          <Label>{t('fieldPromotionType')}</Label>
          <input type="hidden" name="type" value={type} />
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value)
              // Les identifiants de produits et de categories ne se melangent
              // pas : changer de portee remet la selection a « tout ».
              setTargets(['*'])
            }}
          >
            <SelectTrigger className={cn('w-full', fieldClass)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRODUCT">{t('promoType_PRODUCT')}</SelectItem>
              <SelectItem value="CATEGORY">{t('promoType_CATEGORY')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`${formId}-percentage`}>{t('fieldPromotionPercentage')}</Label>
          <Input
            id={`${formId}-percentage`}
            name="percentage"
            type="number"
            min={1}
            max={100}
            step="0.01"
            defaultValue={promotion?.percentage ?? 10}
            required
            className={fieldClass}
          />
          {error === 'percentage' && (
            <p className={errorClass}>{t('errorPromotionPercentage')}</p>
          )}
        </div>

        <div>
          <Label htmlFor={`${formId}-announcementText`}>{t('fieldAnnouncementText')}</Label>
          <Input
            id={`${formId}-announcementText`}
            name="announcementText"
            defaultValue={promotion?.announcementText ?? ''}
            className={fieldClass}
          />
        </div>

        <div>
          <Label htmlFor={`${formId}-startDate`}>{t('fieldStartDate')}</Label>
          <Input
            id={`${formId}-startDate`}
            name="startDate"
            type="date"
            defaultValue={toDateInput(promotion?.startDate ?? null) || today}
            required
            className={fieldClass}
          />
        </div>

        <div>
          <Label htmlFor={`${formId}-endDate`}>{t('fieldEndDate')}</Label>
          <Input
            id={`${formId}-endDate`}
            name="endDate"
            type="date"
            defaultValue={
              toDateInput(promotion?.endDate ?? null) ||
              nextMonth.toISOString().slice(0, 10)
            }
            required
            className={fieldClass}
          />
          {error === 'dates' && <p className={errorClass}>{t('errorDates')}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor={`${formId}-description`}>{t('fieldPromotionDescription')}</Label>
          <Input
            id={`${formId}-description`}
            name="description"
            defaultValue={promotion?.description ?? ''}
            className={fieldClass}
          />
        </div>

        <div className="sm:col-span-2">
          <Label>{t('fieldPromotionTargets')}</Label>
          <input type="hidden" name="targets" value={JSON.stringify(targets)} />
          <div className="mt-2 space-y-3 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-[var(--q2m-ink)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--q2m-accent)]"
                checked={allTargets}
                onChange={(event) => setTargets(event.target.checked ? ['*'] : [])}
              />
              {t('promotionTargetsAll')}
            </label>

            {!allTargets &&
              (options.length > 0 ? (
                <div className="max-h-56 space-y-1.5 overflow-y-auto border-t border-[var(--q2m-line-soft)] pt-3">
                  {options.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-3 text-sm text-[var(--q2m-ink-soft)]"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--q2m-accent)]"
                        checked={targets.includes(option.id)}
                        onChange={() => toggleTarget(option.id)}
                      />
                      <span className="truncate">{option.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="border-t border-[var(--q2m-line-soft)] pt-3 text-xs text-[var(--q2m-ink-stone)]">
                  {t('promotionTargetsEmpty')}
                </p>
              ))}
          </div>
          {error === 'targets' && <p className={errorClass}>{t('manageError_targets')}</p>}
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-4">
        <span className="text-sm font-medium text-[var(--q2m-ink)]">{t('active')}</span>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </label>
      <input type="hidden" name="active" value={isActive ? 'on' : 'off'} />

      {error && !['name', 'percentage', 'dates', 'targets'].includes(error) && (
        <p className="inline-flex items-center gap-2 text-sm text-[var(--q2m-alert)]">
          <AlertCircle className="h-4 w-4" />
          {t(`manageError_${error}`)}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="gap-2 rounded-sm">
          <Save className="h-4 w-4" />
          {pending ? t('saving') : t('save')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}
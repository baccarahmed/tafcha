'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Save } from 'lucide-react'
import { updateSiteSettings } from '@/app/actions/settings'
import { cn } from '@/lib/utils'
import type { SiteSettings } from '@/lib/admin-settings'

const inputClass =
  'q2m-input w-full px-3.5 py-2.5 text-sm text-[var(--q2m-ink)] placeholder:text-[var(--q2m-ink-stone)] outline-none'

const labelClass =
  'mb-2 block text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]'

export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const t = useTranslations('dashboard')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    const toNumber = (key: string) => Number(form.get(key) ?? 0)
    const toBoolean = (key: string) => form.get(key) === 'on'

    startTransition(async () => {
      await updateSiteSettings({
        heroTitle: String(form.get('heroTitle') ?? ''),
        heroSubtitle: String(form.get('heroSubtitle') ?? ''),
        contactEmail: String(form.get('contactEmail') ?? ''),
        contactPhone: String(form.get('contactPhone') ?? ''),
        contactAddress: String(form.get('contactAddress') ?? ''),
        newsletterEnabled: toBoolean('newsletterEnabled'),
        maintenanceMode: toBoolean('maintenanceMode'),
        announcementEnabled: toBoolean('announcementEnabled'),
        announcementText: String(form.get('announcementText') ?? ''),
        freeShippingThreshold: toNumber('freeShippingThreshold'),
        shippingCost: toNumber('shippingCost'),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  const toggles = [
    {
      name: 'announcementEnabled',
      label: t('announcement'),
      defaultChecked: settings.announcementEnabled,
    },
    { name: 'newsletterEnabled', label: t('newsletter'), defaultChecked: settings.newsletterEnabled },
    { name: 'maintenanceMode', label: t('maintenance'), defaultChecked: settings.maintenanceMode },
  ]

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">{t('identity')}</h2>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="heroTitle" className={labelClass}>
              {t('heroTitle')}
            </label>
            <input
              id="heroTitle"
              name="heroTitle"
              defaultValue={settings.heroTitle}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className={labelClass}>
              {t('contactEmail')}
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={settings.contactEmail}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="heroSubtitle" className={labelClass}>
              {t('heroSubtitle')}
            </label>
            <textarea
              id="heroSubtitle"
              name="heroSubtitle"
              rows={3}
              defaultValue={settings.heroSubtitle}
              className={cn(inputClass, 'resize-none')}
            />
          </div>
          <div>
            <label htmlFor="contactPhone" className={labelClass}>
              {t('contactPhone')}
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              defaultValue={settings.contactPhone}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contactAddress" className={labelClass}>
              {t('contactAddress')}
            </label>
            <input
              id="contactAddress"
              name="contactAddress"
              defaultValue={settings.contactAddress}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">{t('shipping')}</h2>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="freeShippingThreshold" className={labelClass}>
              {t('freeShipping')}
            </label>
            <input
              id="freeShippingThreshold"
              name="freeShippingThreshold"
              type="number"
              min={0}
              step="1"
              defaultValue={settings.freeShippingThreshold}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="shippingCost" className={labelClass}>
              {t('shippingCost')}
            </label>
            <input
              id="shippingCost"
              name="shippingCost"
              type="number"
              min={0}
              step="0.01"
              defaultValue={settings.shippingCost}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
        <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">{t('announcement')}</h2>

        <label htmlFor="announcementText" className={cn(labelClass, 'mt-6')}>
          {t('message')}
        </label>
        <textarea
          id="announcementText"
          name="announcementText"
          rows={3}
          defaultValue={settings.announcementText}
          className={cn(inputClass, 'resize-none')}
        />

        <div className="mt-6 flex flex-col gap-3">
          {toggles.map((toggle) => (
            <label
              key={toggle.name}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bone)] p-4 transition-colors hover:border-[var(--q2m-line-strong)]"
            >
              <span className="text-sm font-medium text-[var(--q2m-ink)]">
                {toggle.label}
              </span>
              <input
                type="checkbox"
                name={toggle.name}
                defaultChecked={toggle.defaultChecked}
                className="h-4 w-4 shrink-0 accent-[var(--q2m-accent)]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-sm bg-[var(--q2m-ink)] px-6 py-3 text-sm font-medium text-[var(--q2m-bg-elevated)] transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? t('saved') : t('save')}
        </button>
        {saved && (
          <p className="text-sm text-[var(--q2m-status-open)]">{t('saved')}</p>
        )}
      </div>
    </form>
  )
}

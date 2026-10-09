'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Save } from 'lucide-react'
import { updateSiteSettings } from '@/app/actions/settings'
import { cn } from '@/lib/utils'
import type { SiteSettings } from '@/lib/admin-settings'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const fieldClass = 'border-[var(--q2m-line-soft)] focus-visible:ring-transparent'

export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const t = useTranslations('dashboard')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  // Les interrupteurs Radix ne produisent pas de champ natif : on les fait
  // miroiter dans des inputs caches pour que le FormData lise leur etat.
  const [announcementEnabled, setAnnouncementEnabled] = useState(
    settings.announcementEnabled
  )
  const [newsletterEnabled, setNewsletterEnabled] = useState(
    settings.newsletterEnabled
  )
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    const toNumber = (key: string) => Number(form.get(key) ?? 0)

    startTransition(async () => {
      await updateSiteSettings({
        heroTitle: String(form.get('heroTitle') ?? ''),
        heroSubtitle: String(form.get('heroSubtitle') ?? ''),
        contactEmail: String(form.get('contactEmail') ?? ''),
        contactPhone: String(form.get('contactPhone') ?? ''),
        contactAddress: String(form.get('contactAddress') ?? ''),
        newsletterEnabled,
        maintenanceMode,
        announcementEnabled,
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
      checked: announcementEnabled,
      set: setAnnouncementEnabled,
    },
    {
      name: 'newsletterEnabled',
      label: t('newsletter'),
      checked: newsletterEnabled,
      set: setNewsletterEnabled,
    },
    {
      name: 'maintenanceMode',
      label: t('maintenance'),
      checked: maintenanceMode,
      set: setMaintenanceMode,
    },
  ]

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <Card className="border-[var(--q2m-line-soft)]">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('identity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="heroTitle">{t('heroTitle')}</Label>
              <Input
                id="heroTitle"
                name="heroTitle"
                defaultValue={settings.heroTitle}
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">{t('contactEmail')}</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={settings.contactEmail}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="heroSubtitle">{t('heroSubtitle')}</Label>
              <Textarea
                id="heroSubtitle"
                name="heroSubtitle"
                rows={3}
                defaultValue={settings.heroSubtitle}
                className={cn(fieldClass, 'resize-none')}
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">{t('contactPhone')}</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                defaultValue={settings.contactPhone}
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="contactAddress">{t('contactAddress')}</Label>
              <Input
                id="contactAddress"
                name="contactAddress"
                defaultValue={settings.contactAddress}
                className={fieldClass}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--q2m-line-soft)]">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('shipping')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="freeShippingThreshold">{t('freeShipping')}</Label>
              <Input
                id="freeShippingThreshold"
                name="freeShippingThreshold"
                type="number"
                min={0}
                step="1"
                defaultValue={settings.freeShippingThreshold}
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="shippingCost">{t('shippingCost')}</Label>
              <Input
                id="shippingCost"
                name="shippingCost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={settings.shippingCost}
                className={fieldClass}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--q2m-line-soft)]">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('announcement')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="announcementText">{t('message')}</Label>
          <Textarea
            id="announcementText"
            name="announcementText"
            rows={3}
            defaultValue={settings.announcementText}
            className={cn(fieldClass, 'resize-none')}
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
                <Switch
                  checked={toggle.checked}
                  onCheckedChange={toggle.set}
                  aria-label={toggle.label}
                />
                <input
                  type="hidden"
                  name={toggle.name}
                  value={toggle.checked ? 'on' : 'off'}
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={pending}
          className="gap-2 rounded-sm bg-[var(--q2m-ink)] text-[var(--q2m-bg-elevated)] hover:opacity-85"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? t('saved') : t('save')}
        </Button>
        {saved && (
          <p className="text-sm text-[var(--q2m-status-open)]">{t('saved')}</p>
        )}
      </div>
    </form>
  )
}
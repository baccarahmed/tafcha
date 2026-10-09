'use client'

/**
 * Bannière de consentement cookies, dans la charte Q2M (fond noir, accent or).
 *
 * S'affiche tant qu'aucun choix n'a été enregistré. « Accepter » débloque le
 * Meta Pixel ; « Refuser » garde le site sans tracking.
 */

import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { getConsent, setConsent, subscribeConsent } from '@/lib/consent'

export default function CookieConsent() {
  const t = useTranslations('cookies')
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null)

  if (consent !== null) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('label')}
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-[var(--q2m-accent)] bg-[var(--q2m-bg-dark)] text-[var(--q2m-on-dark)]"
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between lg:px-12">
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--q2m-on-dark-soft)]">
          {t('message')}
        </p>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setConsent('declined')}
            className="border border-[var(--q2m-line)] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--q2m-on-dark-soft)] transition-colors hover:border-[var(--q2m-accent)] hover:text-[var(--q2m-accent)]"
          >
            {t('decline')}
          </button>
          <button type="button" onClick={() => setConsent('accepted')} className="q2m-btn-primary">
            {t('accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
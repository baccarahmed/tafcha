'use client'

/**
 * Bannière de consentement cookies, dans la charte Q2M (fond noir, accent or).
 *
 * S'affiche tant qu'aucun choix n'a été enregistré. « Accepter » débloque le
 * Meta Pixel ; « Refuser » garde le site sans tracking.
 */

import { useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { getConsent, setConsent, subscribeConsent } from '@/lib/consent'

/**
 * Courbe des panneaux qui glissent depuis un bord : miroir framer de
 * `--q2m-ease-drawer`. Une bannière collée au bas de l'écran est une feuille,
 * pas un popover — elle doit sortir par là où elle est entrée.
 */
const DRAWER_EASE = [0.32, 0.72, 0, 1] as const

export default function CookieConsent() {
  const t = useTranslations('cookies')
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null)
  const reduceMotion = useReducedMotion()

  /**
   * Le store est la source de vérité, mais il n'a pas d'état « en train de
   * sortir » : garder le bandeau monté pendant l'animation de sortie demande un
   * drapeau local. Il n'est lu qu'après le départ, donc si un autre onglet ou un
   * test remet le consentement à `null`, `visible` redevient vrai de lui-même —
   * pas besoin d'effet de synchronisation.
   */
  const [dismissing, setDismissing] = useState(false)

  const visible = consent === null && !dismissing

  const dismiss = (value: 'accepted' | 'declined') => {
    setDismissing(true)
    setConsent(value)
  }

  const leave = reduceMotion ? { opacity: 0 } : { opacity: 0, y: '100%' }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label={t('label')}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={leave}
          transition={
            reduceMotion
              ? { duration: 0.2, ease: 'easeOut' }
              : { duration: 0.45, ease: DRAWER_EASE }
          }
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-[var(--q2m-accent)] bg-[var(--q2m-bg-dark)] text-[var(--q2m-on-dark)]"
        >
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between lg:px-12">
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--q2m-on-dark-soft)]">
              {t('message')}
            </p>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => dismiss('declined')}
                className="border border-[var(--q2m-line)] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--q2m-on-dark-soft)] transition-colors hover:border-[var(--q2m-accent)] hover:text-[var(--q2m-accent)]"
              >
                {t('decline')}
              </button>
              <button type="button" onClick={() => dismiss('accepted')} className="q2m-btn-primary">
                {t('accept')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
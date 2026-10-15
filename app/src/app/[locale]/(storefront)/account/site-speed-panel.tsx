'use client'

import { useTranslations } from 'next-intl'
import { useReportWebVitals } from 'next/web-vitals'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type VitalsName = 'TTFB' | 'LCP' | 'INP' | 'CLS' | 'FCP'

type Vitals = Partial<Record<VitalsName, number>>

/** Les metriques de type Web Vitals, en millisecondes, sauf CLS (sans unite). */
const ORDER: VitalsName[] = ['TTFB', 'FCP', 'LCP', 'INP', 'CLS']

/**
 * Mesures de performance relevees dans le navigateur du visiteur.
 *
 * Deux familles : les Web Vitals du chargement courant (`useReportWebVitals`)
 * et le temps de transition entre deux pages mesure cote client. Ce dernier est
 * une approximation (temps entre deux rendus successifs) : il depend surtout du
 * reseau et de l'appareil de l'utilisateur, pas des serveurs Q2M, et n'a donc
 * qu'une valeur indicative.
 */
export default function SiteSpeedPanel() {
  const t = useTranslations('account')
  const pathname = usePathname()

  const [vitals, setVitals] = useState<Vitals>({})
  const [navigationMs, setNavigationMs] = useState<number | null>(null)
  const lastNavigation = useRef<number | null>(null)

  useReportWebVitals((metric) => {
    if (!ORDER.includes(metric.name as VitalsName)) return
    setVitals((current) => ({ ...current, [metric.name]: metric.value }))
  })

  useEffect(() => {
    const now = performance.now()
    if (lastNavigation.current !== null) {
      setNavigationMs(Math.round(now - lastNavigation.current))
    }
    lastNavigation.current = now
  }, [pathname])

  const rows: Array<{ label: string; value: string }> = []

  if (navigationMs !== null) {
    rows.push({ label: t('speedNavigation'), value: `${navigationMs} ms` })
  }

  for (const name of ORDER) {
    const value = vitals[name]
    if (value === undefined) continue
    rows.push({
      label: t(`speed_${name}`),
      value: name === 'CLS' ? value.toFixed(3) : `${Math.round(value)} ms`,
    })
  }

  return (
    <div className="max-w-2xl border border-line">
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-sm font-bold">{t('speedTitle')}</h2>
        <p className="mt-1 text-xs text-ink-mute">{t('speedLead')}</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-4 text-sm text-ink-mute">{t('speedCollecting')}</p>
      ) : (
        <dl className="divide-y divide-line">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-6 py-3">
              <dt className="text-xs uppercase tracking-wider text-ink-mute">{row.label}</dt>
              <dd className="text-sm font-medium tabular-nums text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="border-t border-line px-6 py-3 text-[11px] text-ink-stone">{t('speedNote')}</p>
    </div>
  )
}

'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { Languages, Check, ChevronDown } from 'lucide-react'
import { routing, LOCALE_LABELS, type Locale } from '@/i18n/routing'

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const locale = useLocale() as Locale
  const t = useTranslations('language')
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function select(next: Locale) {
    setOpen(false)
    // Swap only the locale so the visitor keeps the current page,
    // including dynamic segments like /product/[slug].
    startTransition(() => router.replace(pathname, { locale: next }))
  }

  const current = LOCALE_LABELS[locale]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('label')}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-10 items-center gap-1.5 rounded-sm border border-white/15 px-3 text-[var(--q2m-on-dark-soft)] transition-[color,border-color,transform] duration-180 ease-q2m hover:border-[var(--q2m-accent)] hover:text-[var(--q2m-accent)] focus-visible:border-[var(--q2m-accent)] active:scale-[0.98]"
      >
        <Languages size={16} strokeWidth={1.75} />
        <span className="text-[11px] font-extrabold tracking-[0.08em]">{current.native}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`transition-transform duration-140 ease-q2m ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('label')}
          className="absolute end-0 top-[calc(100%+0.5rem)] z-50 min-w-[10rem] origin-top-right overflow-hidden rounded-sm border border-white/10 bg-black py-1 shadow-2xl transition-[opacity,transform] duration-140 ease-q2m rtl:origin-top-left"
        >
          {routing.locales.map((code) => {
            const item = LOCALE_LABELS[code]
            const active = code === locale

            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => select(code)}
                  lang={code}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm transition-colors duration-140 ease-q2m ${
                    active
                      ? 'bg-white/5 text-[var(--q2m-accent)]'
                      : 'text-[var(--q2m-on-dark-soft)] hover:bg-white/5 hover:text-[var(--q2m-on-dark)]'
                  }`}
                >
                  <span aria-hidden className="text-base leading-none">
                    {item.flag}
                  </span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {active && <Check size={14} className="text-[var(--q2m-accent)]" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
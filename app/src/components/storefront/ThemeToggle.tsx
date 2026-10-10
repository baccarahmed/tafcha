'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, Check, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

type ThemeValue = 'light' | 'dark' | 'system'

/**
 * Three-way appearance control (light / dark / system), chrome-agnostic: the
 * trigger is styled for the always-black navbar and dashboard topbar, and the
 * panel inherits the same material as `LanguageSwitcher`.
 *
 * The trigger icons are swapped with CSS on the `.dark` class, so there is no
 * client state to hydrate and no flash of the wrong icon — the menu (which
 * reads the resolved theme to show the active check) only mounts once opened,
 * well after hydration.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('theme')
  const [open, setOpen] = useState(false)
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

  const options: { value: ThemeValue; label: string; icon: LucideIcon }[] = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: Monitor },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('label')}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/15 text-[var(--q2m-on-dark-soft)] transition-[color,border-color,transform] duration-180 ease-q2m hover:border-[var(--q2m-accent)] hover:text-[var(--q2m-accent)] focus-visible:border-[var(--q2m-accent)] active:scale-[0.98]"
      >
        <Sun
          size={17}
          strokeWidth={1.75}
          aria-hidden
          className="hidden [.dark_&]:block"
        />
        <Moon
          size={17}
          strokeWidth={1.75}
          aria-hidden
          className="block [.dark_&]:hidden"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('label')}
          className="absolute end-0 top-[calc(100%+0.5rem)] z-50 min-w-[10rem] origin-top-right overflow-hidden rounded-sm border border-white/10 bg-black py-1 shadow-2xl transition-[opacity,transform] duration-140 ease-q2m starting:-translate-y-1 starting:opacity-0 rtl:origin-top-left"
        >
          {options.map(({ value, label, icon: Icon }) => {
            const active = theme === value

            return (
              <li key={value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setTheme(value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm transition-colors duration-140 ease-q2m ${
                    active
                      ? 'bg-white/5 text-[var(--q2m-accent)]'
                      : 'text-[var(--q2m-on-dark-soft)] hover:bg-white/5 hover:text-[var(--q2m-on-dark)]'
                  }`}
                >
                  <Icon size={15} strokeWidth={1.75} aria-hidden className="shrink-0" />
                  <span className="flex-1 font-medium">{label}</span>
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

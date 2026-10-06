'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * Both icons are rendered and swapped with CSS on the .dark class, so there is
 * no client state to hydrate and no flash of the wrong icon.
 *
 * The label does depend on resolvedTheme, which is undefined on the very first
 * render (server and client alike) and only settles once next-themes has read
 * localStorage. The server therefore emits the `toDark` label while the client
 * already knows the theme is dark, so the attribute is expected to differ on
 * hydration. suppressHydrationWarning silences that one attribute; the next
 * render corrects it with the real theme.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations('theme')

  const isDark = resolvedTheme === 'dark'
  const label = isDark ? t('toLight') : t('toDark')

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      suppressHydrationWarning
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:bg-overlay-hover hover:text-accent"
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
  )
}
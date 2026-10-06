'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { motion } from 'framer-motion'
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Tag,
  Users,
  Settings,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { useLocale, useTranslations } from 'next-intl'
import type { SessionUser } from '@/lib/session'
import { Q2M, Q2M_BRAND_IMAGES } from '@/lib/q2m-tokens'

const NAV = [
  { key: 'overview', href: '/dashboard', icon: LayoutDashboard },
  { key: 'products', href: '/dashboard/products', icon: Package },
  { key: 'orders', href: '/dashboard/orders', icon: ShoppingCart },
  { key: 'users', href: '/dashboard/users', icon: Users },
  { key: 'promotions', href: '/dashboard/promotions', icon: Tag },
  { key: 'drops', href: '/dashboard/drops', icon: CalendarDays },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
] as const

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('dashboard')
  const tNav = useTranslations('nav')
  const logoSrc = Q2M_BRAND_IMAGES.logo
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  const initial = (user.firstName ?? user.email ?? 'A').charAt(0).toUpperCase()
  const current = NAV.find((item) => pathname === item.href)

  return (
    <div className="flex min-h-screen bg-[var(--q2m-bg)]">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? '16rem' : '4.5rem' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed inset-y-0 start-0 z-40 flex flex-col border-e border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] lg:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--q2m-line-soft)] px-4 py-5">
          {sidebarOpen ? (
            <Link href="/dashboard" className="flex items-center gap-2.5" aria-label={Q2M.brand}>
              <Image
                src={logoSrc}
                alt={`${Q2M.brand} dashboard`}
                width={36}
                height={36}
                unoptimized
                className="q2m-logo h-9 w-9 shrink-0 rounded-sm object-contain object-[50%_25%]"
              />
              <span className="text-sm font-semibold tracking-[0.18em] text-[var(--q2m-ink)]">
                Q2M
              </span>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              aria-label={Q2M.brand}
              className="mx-auto flex h-9 w-9 items-center justify-center"
            >
              <Image
                src={logoSrc}
                alt={`${Q2M.brand} dashboard`}
                width={36}
                height={36}
                unoptimized
                className="q2m-logo h-9 w-9 object-contain object-[50%_25%]"
              />
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? t('collapseSidebar') : t('expandSidebar')}
            className="hidden p-1.5 text-[var(--q2m-ink-stone)] transition-colors hover:text-[var(--q2m-ink)] lg:block"
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={t(item.key)}
                className={`mb-1 flex items-center gap-3 rounded-sm border-s-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-[var(--q2m-accent)] bg-[var(--q2m-bone)] text-[var(--q2m-ink)]'
                    : 'border-transparent text-[var(--q2m-ink-mute)] hover:bg-[var(--q2m-bone)] hover:text-[var(--q2m-ink)]'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    active ? 'text-[var(--q2m-accent-text)]' : ''
                  }`}
                />
                {sidebarOpen && <span className="whitespace-nowrap">{t(item.key)}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[var(--q2m-line-soft)] px-3 py-4">
          <div
            className={`mb-2 flex items-center gap-3 rounded-sm bg-[var(--q2m-bone)] px-3 py-3 ${
              sidebarOpen ? '' : 'justify-center px-0'
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--q2m-ink)]">
              <span className="text-sm font-semibold text-[var(--q2m-bg-elevated)]">
                {initial}
              </span>
            </span>
            {sidebarOpen && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[var(--q2m-ink)]">
                  {displayName}
                </span>
                <span className="block truncate text-xs text-[var(--q2m-ink-stone)]">
                  {user.email}
                </span>
              </span>
            )}
          </div>

          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className={`w-full px-3 py-2.5 text-start text-sm font-medium text-[var(--q2m-ink-mute)] transition-colors hover:bg-[var(--q2m-alert)]/10 hover:text-[var(--q2m-alert)] ${
                sidebarOpen ? '' : 'text-center'
              }`}
            >
              {sidebarOpen ? tNav('signOut') : '↩'}
            </button>
          </form>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar noir #000000 dans les deux modes — même chrome que la vitrine */}
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black px-4 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={t('openNavigationMenu')}
                className="p-2 text-[var(--q2m-on-dark-soft)] transition-colors hover:text-[var(--q2m-accent)] lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="min-w-0"
              >
                <h1 className="truncate text-xl font-semibold text-[#f6f4ef] md:text-2xl">
                  {current ? t(current.key) : t('title')}
                </h1>
                <p className="truncate text-xs text-[var(--q2m-on-dark-soft)]">
                  {t('signedInAs', { email: user.email })}
                </p>
              </motion.div>
            </div>

            <Link
              href="/"
              className="shrink-0 rounded-sm border border-white/20 px-3 py-2 text-xs font-medium text-[var(--q2m-on-dark-soft)] transition-colors hover:border-[var(--q2m-accent)] hover:text-[var(--q2m-accent)]"
            >
              {t('backToStore')}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}

export default DashboardShell

'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { motion } from 'framer-motion'
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ExternalLink,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Tag,
  Users,
  Settings,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/storefront/ThemeToggle'
import { LanguageSwitcher } from '@/components/storefront/LanguageSwitcher'
import type { SessionUser } from '@/lib/session'
import { Q2M, Q2M_BRAND_IMAGES } from '@/lib/q2m-tokens'

const NAV = [
  { key: 'overview', href: '/dashboard', icon: LayoutDashboard },
  { key: 'products', href: '/dashboard/products', icon: Package },
  { key: 'orders', href: '/dashboard/orders', icon: ShoppingCart },
  { key: 'users', href: '/dashboard/users', icon: Users },
  { key: 'promotions', href: '/dashboard/promotions', icon: Tag },
  { key: 'drops', href: '/dashboard/drops', icon: CalendarDays },
  { key: 'photoGallery', href: '/dashboard/gallery', icon: Images },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
] as const

function LogoLink({ collapsed }: { collapsed?: boolean }) {
  const t = useTranslations('dashboard')

  return (
    <Link
      href="/dashboard"
      aria-label={Q2M.brand}
      className={cn(
        'flex items-center gap-2.5',
        collapsed ? 'mx-auto flex h-9 w-9 items-center justify-center' : ''
      )}
    >
      <Image
        src={Q2M_BRAND_IMAGES.logo}
        alt={`${Q2M.brand} ${t('title')}`}
        width={36}
        height={36}
        className="q2m-logo h-9 w-9 shrink-0 rounded-sm object-contain object-[50%_25%]"
      />
      {!collapsed && (
        <span className="text-sm font-semibold tracking-[0.18em] text-[var(--q2m-ink)]">
          {Q2M.brand}
        </span>
      )}
    </Link>
  )
}

function NavItems({
  pathname,
  collapsed,
  onNavigate,
  locale,
  user,
}: {
  pathname: string
  collapsed?: boolean
  onNavigate?: () => void
  locale: string
  user: SessionUser
}) {
  const t = useTranslations('dashboard')
  const tNav = useTranslations('nav')
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  const initial = (user.firstName ?? user.email ?? 'A').charAt(0).toUpperCase()

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={t(item.key)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'mb-1 flex items-center gap-3 rounded-sm border-s-2 px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-[var(--q2m-accent)] bg-[var(--q2m-bone)] text-[var(--q2m-ink)]'
                  : 'border-transparent text-[var(--q2m-ink-mute)] hover:bg-[var(--q2m-bone)] hover:text-[var(--q2m-ink)]',
                collapsed && 'justify-center border-s-0 px-0'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  active ? 'text-[var(--q2m-accent-text)]' : ''
                )}
              />
              {!collapsed && <span className="whitespace-nowrap">{t(item.key)}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[var(--q2m-line-soft)] px-3 py-4">
        <div
          className={cn(
            'mb-2 flex items-center gap-3 rounded-sm bg-[var(--q2m-bone)] px-3 py-3',
            collapsed && 'justify-center px-0'
          )}
        >
          <Avatar className="h-9 w-9 shrink-0 rounded-full">
            <AvatarFallback className="bg-[var(--q2m-ink)] text-sm font-semibold text-[var(--q2m-bg-elevated)]">
              {initial}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
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
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-start gap-2 px-3 text-sm font-medium text-[var(--q2m-ink-mute)] hover:bg-[var(--q2m-alert)]/10 hover:text-[var(--q2m-alert)]',
              collapsed && 'justify-center px-0'
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && tNav('signOut')}
          </Button>
        </form>
      </div>
    </>
  )
}

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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const current = NAV.find((item) => pathname === item.href)

  return (
    <div className="flex min-h-screen bg-[var(--q2m-bg)]">
      {/* Coque mobile : Sheet shadcn */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[300px] border-e border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-0 sm:max-w-[300px]"
        >
          <SheetHeader className="flex-row items-center justify-start gap-2.5 border-b border-[var(--q2m-line-soft)] px-4 py-5">
            <LogoLink />
            <SheetTitle className="sr-only">{t('title')}</SheetTitle>
            <SheetDescription className="sr-only">{user.email}</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <NavItems
              pathname={pathname}
              locale={locale}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar desktop repliable — animation CSS (width) plutôt que Framer :
         évite de piloter la mise en page depuis le thread JS et honore
         `prefers-reduced-motion` via la règle globale. */}
      <aside
        className={cn(
          'hidden border-e border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] transition-[width] duration-240 ease-q2m lg:flex lg:flex-col',
          sidebarOpen ? 'w-64' : 'w-[4.5rem]'
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--q2m-line-soft)] px-4 py-5">
          <LogoLink collapsed={!sidebarOpen} />
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? t('collapseSidebar') : t('expandSidebar')}
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 text-[var(--q2m-ink-stone)] hover:text-[var(--q2m-ink)] lg:inline-flex"
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform duration-240 ease-q2m',
                !sidebarOpen && 'rotate-180'
              )}
            />
          </Button>
        </div>

        <NavItems
          pathname={pathname}
          collapsed={!sidebarOpen}
          locale={locale}
          user={user}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar noir #000000 dans les deux modes — même chrome que la vitrine */}
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black px-4 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={t('openNavigationMenu')}
                variant="ghost"
                size="icon"
                className="p-2 text-[var(--q2m-on-dark-soft)] hover:text-[var(--q2m-accent)] lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
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

            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm" className="text-[var(--q2m-on-dark-soft)] hover:text-[var(--q2m-accent)]">
                <Link href="/">
                  <span className="hidden sm:inline">{t('backToStore')}</span>
                  <ExternalLink className="h-3.5 w-3.5 sm:ms-2" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}

export default DashboardShell
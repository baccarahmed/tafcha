import { redirect } from '@/i18n/navigation'
import { hasLocale } from 'next-intl'
import { routing, type Locale } from '@/i18n/routing'
import { getSessionUser } from '@/lib/session'
import { DashboardShell } from './dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  // The [locale] layout already rejected unknown locales, so this is a no-op
  // cast that only narrows the type for the locale-aware redirect.
  const activeLocale = (hasLocale(routing.locales, locale) ? locale : routing.defaultLocale) as Locale
  const user = await getSessionUser()

  if (!user) {
    redirect({ href: '/login', locale: activeLocale })
  }

  if (user.role !== 'ADMIN') {
    redirect({ href: '/', locale: activeLocale })
  }

  return <DashboardShell user={user}>{children}</DashboardShell>
}
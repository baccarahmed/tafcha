import { redirect } from '@/i18n/navigation'
import { hasLocale } from 'next-intl'
import { routing, type Locale } from '@/i18n/routing'
import { getSessionAdmin } from '@/lib/admin-guard'
import { getSessionUser } from '@/lib/session'
import { listNotifications } from '@/lib/notifications'
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

  // MFA admin (VULN-001) : le mot de passe seul ne suffit plus pour entrer
  // dans le back-office quand ce compte est inscrit au second facteur. Sans
  // preuve TOTP valide pour ce navigateur, on bascule sur le challenge /mfa
  // (hors /dashboard, pour ne pas boucler sur ce meme garde).
  const admin = await getSessionAdmin()
  if (admin && !admin.mfaSatisfied) {
    redirect({ href: '/mfa', locale: activeLocale })
  }

  const notifications = await listNotifications(user.id).catch(() => [])

  return (
    <DashboardShell user={user} notifications={notifications}>
      {children}
    </DashboardShell>
  )
}
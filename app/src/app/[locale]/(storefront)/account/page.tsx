import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { hasLocale } from 'next-intl'
import { routing, type Locale } from '@/i18n/routing'
import { buildMetadata } from '@/lib/seo'
import { getSessionUser } from '@/lib/session'
import { getMyOrders } from '@/lib/customer-orders'
import AccountTabs from './account-tabs'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })

  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/account',
    noIndex: true,
  })
}

export default async function AccountPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const activeLocale = (
    hasLocale(routing.locales, locale) ? locale : routing.defaultLocale
  ) as Locale
  const user = await getSessionUser().catch(() => null)

  // Espace membre : un visiteur non connecte est renvoye vers la connexion,
  // puis ramene ici apres authentification (`next`).
  if (!user) {
    redirect({ href: '/login?next=/account', locale: activeLocale })
  }

  const orders = await getMyOrders(user.id).catch(() => [])

  return (
    <AccountTabs
      user={{
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }}
      orders={orders}
      locale={locale}
    />
  )
}

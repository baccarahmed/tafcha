import type { Metadata } from 'next'
import { Link, redirect } from '@/i18n/navigation'
import { Q2MLogo } from '@/components/brand/Q2MLogo'
import { routing, type Locale } from '@/i18n/routing'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import { getSessionUser } from '@/lib/session'
import { safeReturnPath } from '@/lib/safe-redirect'
import RegisterForm from './register-form'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })

  return buildMetadata({
    locale,
    title: t('registerMetaTitle'),
    description: t('registerMetaDescription'),
    path: '/register',
    noIndex: true,
  })
}

export default async function RegisterPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { next } = await searchParams
  setRequestLocale(locale)

  const activeLocale = (hasLocale(routing.locales, locale) ? locale : routing.defaultLocale) as Locale

  // Deja connecte : redirige vers /account (client) ou /dashboard (admin)
  const user = await getSessionUser()
  if (user) {
    redirect({
      href: user.role === 'ADMIN' ? '/dashboard' : '/account',
      locale: activeLocale,
    })
  }

  const t = await getTranslations({ locale: activeLocale, namespace: 'auth' })

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-5 py-16"
      style={{ background: 'var(--q2m-bg)' }}
    >
      <Link
        href="/"
        aria-label="Q2M"
        className="mb-10 transition-opacity hover:opacity-80"
      >
        <Q2MLogo size={56} />
      </Link>

      <div className="w-full max-w-md">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent">
          {t('registerKicker')}
        </p>
        <h1 className="mb-8 text-3xl font-black uppercase tracking-[-0.02em]">
          {t('registerTitle')}
        </h1>

        <RegisterForm next={safeReturnPath(next ?? '')} />
      </div>

      <p className="mt-8 text-sm text-ink-mute">
        {t('registerHasAccount')}{' '}
        <Link
          href="/login"
          className="font-bold text-accent underline-offset-4 hover:underline"
        >
          {t('registerLoginLink')}
        </Link>
      </p>
    </main>
  )
}

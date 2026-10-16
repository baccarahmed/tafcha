import type { Metadata } from 'next'
import { Link, redirect } from '@/i18n/navigation'
import { Q2MLogo } from '@/components/brand/Q2MLogo'
import { routing, type Locale } from '@/i18n/routing'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'
import { getSessionUser } from '@/lib/session'
import { safeReturnPath } from '@/lib/safe-redirect'
import LoginForm from './login-form'

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
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/login',
    noIndex: true,
  });
}

export default async function LoginPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { next } = await searchParams
  setRequestLocale(locale)
  // The [locale] layout already rejected unknown locales.
  const activeLocale = (hasLocale(routing.locales, locale) ? locale : routing.defaultLocale) as Locale

  const t = await getTranslations('auth')
  // Seule une destination interne est rejouée après connexion (le même garde
  // s'applique ensuite côté server action, `next` pouvant être forgé).
  const nextPath = safeReturnPath(next)

  const user = await getSessionUser()

  if (user) {
    redirect({
      href: nextPath ?? (user.role === 'ADMIN' ? '/dashboard' : '/'),
      locale: activeLocale,
    })
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-24"
      style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}
    >
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <span className="text-[11px] font-extrabold tracking-[0.16em] text-ink-mute transition-colors hover:text-accent">
            {t('back')}
          </span>
        </Link>

        <div className="mb-6 flex justify-center">
          <Q2MLogo size={120} priority />
        </div>

        <p className="q2m-eyebrow mb-3 text-center">
          {t('loginKicker')}
        </p>
        <h1 className="q2m-display mb-8 text-center">
          {t('loginTitle')}
        </h1>

        <LoginForm next={nextPath} />

        <p className="mt-8 text-[11px] leading-relaxed text-ink-mute">
          {t('notice')}
        </p>
      </div>
    </main>
  )
}
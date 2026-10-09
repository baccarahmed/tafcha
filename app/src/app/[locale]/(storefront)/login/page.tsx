import Image from 'next/image'
import type { Metadata } from 'next'
import { Link, redirect } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import { Q2M, Q2M_FONT, Q2M_BRAND_IMAGES } from '@/lib/q2m-tokens'
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

  // Meme fichier de logo que la vitrine : la classe `q2m-logo` bascule
  // automatiquement le rendu selon le thème actif.
  const logoSrc = Q2M_BRAND_IMAGES.logo

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
          <Image
            src={logoSrc}
            alt={`${Q2M.brand} — ${Q2M.brandFull}`}
            width={220}
            height={220}
            priority
            className="q2m-logo h-[220px] w-[220px] rounded-full object-contain"
          />
        </div>

        <p className="mb-3 text-center text-[11px] font-extrabold tracking-[0.16em] text-accent">
          {t('loginKicker')}
        </p>
        <h1 className="mb-8 text-4xl font-black leading-none tracking-[-0.02em]">
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
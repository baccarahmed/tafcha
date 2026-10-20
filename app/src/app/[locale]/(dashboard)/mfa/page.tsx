import type { Metadata } from 'next'
import { redirect } from '@/i18n/navigation'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing, type Locale } from '@/i18n/routing'
import { buildMetadata } from '@/lib/seo'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'
import { getSessionAdmin } from '@/lib/admin-guard'
import { getSessionUser } from '@/lib/session'
import { safeReturnPath } from '@/lib/safe-redirect'
import MfaForm from './mfa-form'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ next?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'mfa' })

  return buildMetadata({
    locale,
    title: t('challengeTitle'),
    description: t('challengeDescription'),
    path: '/mfa',
    noIndex: true,
  })
}

/**
 * Challenge TOTP (VULN-001) : le layout du dashboard rejette ici les admins
 * dont le navigateur n'a pas de preuve MFA valide ; l'execution arrive donc
 * uniquement dans l'etat « mot de passe ok, code requis ». La page vit hors
 * /dashboard (route group sans layout dashboard) pour eviter la boucle de
 * redirection avec le garde lui-meme.
 */
export default async function MfaChallengePage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { next } = await searchParams
  setRequestLocale(locale)
  const activeLocale = (hasLocale(routing.locales, locale) ? locale : routing.defaultLocale) as Locale

  const user = await getSessionUser()
  if (!user) redirect({ href: '/login', locale: activeLocale })
  if (user.role !== 'ADMIN') redirect({ href: '/', locale: activeLocale })

  const admin = await getSessionAdmin()
  // Pas de challenge en attente : MFA desactive sur ce compte, ou preuve
  // deja presente (double soumission / onglet conserve).
  if (!admin || admin.mfaSatisfied) redirect({ href: '/dashboard', locale: activeLocale })

  const t = await getTranslations('mfa')

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-24"
      style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}
    >
      <div className="w-full max-w-sm">
        <p className="q2m-eyebrow mb-3 text-center">BACK-OFFICE Q2M</p>
        <h1 className="q2m-display mb-4 text-center">{t('challengeTitle')}</h1>
        <p className="mb-8 text-center text-sm leading-relaxed text-ink-mute">
          {t('challengeDescription')}
        </p>

        <MfaForm next={safeReturnPath(next) ?? '/dashboard'} />
      </div>
    </main>
  )
}

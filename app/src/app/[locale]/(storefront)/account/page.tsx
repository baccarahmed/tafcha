import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { buildMetadata } from '@/lib/seo'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'
import { getSessionUser } from '@/lib/session'
import { signOut } from '@/app/actions/auth'

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

  const t = await getTranslations('account')
  const user = await getSessionUser().catch(() => null)

  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pt-24 pb-16 lg:px-14">
        <p className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-accent">
          {t('kicker')}
        </p>

        {user ? (
          <>
            <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.02em] md:text-7xl">
              {user.firstName ?? user.email}
            </h1>
            <p className="mt-6 text-sm text-ink-mute">
              {t('signedInAs')} {user.email}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-5xl font-black uppercase leading-none tracking-[-0.02em] md:text-7xl">
              {t('guestTitle')}
            </h1>
            <p className="mt-6 max-w-xl leading-relaxed text-ink-soft">{t('guestLead')}</p>
          </>
        )}
      </section>

      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pb-24 lg:px-14">
        {user ? (
          <div className="max-w-2xl border border-line">
            <div className="border-b border-line px-6 py-4">
              <h2 className="text-sm font-bold">{t('profile')}</h2>
            </div>

            <dl className="divide-y divide-line">
              {[
                { label: t('firstName'), value: user.firstName ?? t('notSet') },
                { label: t('lastName'), value: user.lastName ?? t('notSet') },
                { label: t('email'), value: user.email },
                {
                  label: t('role'),
                  value: user.role === 'ADMIN' ? t('roleAdmin') : t('roleCustomer'),
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-6 py-4">
                  <dt className="text-xs uppercase tracking-wider text-ink-mute">{row.label}</dt>
                  <dd className="text-sm font-medium text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-5">
              {user.role === 'ADMIN' && (
                <Link href="/dashboard" className="q2m-btn-primary">
                  {t('dashboard')}
                </Link>
              )}

              <form action={signOut}>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="border border-[var(--q2m-line)] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--q2m-ink-soft)] transition-colors hover:border-[var(--q2m-alert)] hover:text-[var(--q2m-alert)]"
                >
                  {t('signOut')}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <Link href="/login" className="q2m-btn-primary">
            {t('login')}
          </Link>
        )}
      </section>
    </main>
  )
}

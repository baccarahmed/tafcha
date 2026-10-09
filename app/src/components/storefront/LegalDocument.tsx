import { Link } from '@/i18n/navigation'
import { getMessages, getTranslations } from 'next-intl/server'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'

export type LegalDocKey = 'terms' | 'privacy' | 'cookies' | 'returns'

interface LegalSection {
  heading: string
  body: string
}

interface LegalDoc {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

/**
 * Rendu commun aux pages légales (CGV, confidentialité, cookies, retours).
 *
 * Le contenu vit dans `messages/*.json` sous le namespace `legal` : une même
 * page sert les trois langues sans dupliquer le balisage. Le corps de chaque
 * section peut contenir plusieurs paragraphes séparés par une ligne vide.
 */
export default async function LegalDocument({ docKey }: { docKey: LegalDocKey }) {
  const t = await getTranslations('legal')
  const messages = await getMessages()

  const legal = (messages as unknown as { legal: Record<string, LegalDoc> }).legal
  const doc = legal[docKey]

  return (
    <main
      className="min-h-screen"
      style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}
    >
      <article className="mx-auto max-w-[820px] px-5 pb-24 pt-24 sm:px-10">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent">
          {t('kicker')}
        </p>

        <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.02em] text-ink md:text-5xl">
          {doc.title}
        </h1>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-ink-mute">
          {t('updatedLabel')} — {doc.updated}
        </p>

        {doc.intro && (
          <p className="mt-8 text-base leading-relaxed text-ink-soft">{doc.intro}</p>
        )}

        <div className="mt-10 flex flex-col gap-8">
          {doc.sections.map((section, index) => (
            <section
              key={index}
              className="border-t pt-8"
              style={{ borderColor: Q2M.lineSoft }}
            >
              <h2 className="text-lg font-extrabold tracking-tight text-ink">
                {section.heading}
              </h2>

              {section.body.split('\n\n').map((paragraph, pIndex) => (
                <p key={pIndex} className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-14">
          <Link href="/contact" className="q2m-btn-primary">
            {t('contactCta')}
          </Link>
        </div>
      </article>
    </main>
  )
}
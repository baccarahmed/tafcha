import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * 404 localisé. Sans lui, Next sert sa page par défaut (non traduite) :
 * le status reste 404 (non indexable), mais l'expérience et le crawl
 * des liens cassés en profitent.
 */
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations('notFound');

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
        404
      </p>
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="max-w-md text-neutral-500">{t('body')}</p>
      <Link
        href={`/${locale}`}
        className="mt-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-neutral-50 transition-colors hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-300"
      >
        {t('cta')}
      </Link>
    </main>
  );
}

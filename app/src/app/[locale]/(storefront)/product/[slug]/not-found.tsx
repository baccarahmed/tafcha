import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export default async function ProductNotFound() {
  const t = await getTranslations('product');

  return (
    <main
      className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24"
      style={{ background: 'var(--nova-bg)' }}
    >
      <div className="text-center max-w-lg">
        <div className="text-7xl mb-6 opacity-30">👟</div>
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-[-0.02em]">
          <span className="text-accent">404</span>{' '}
          <span className="text-ink">{t('notFoundTitle')}</span>
        </h1>
        <p className="text-ink-soft text-base md:text-lg mb-8">
          {t('notFoundBody')}
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center bg-accent px-8 py-4 text-sm font-bold tracking-[0.08em] text-on-accent transition-transform hover:scale-[1.02]"
        >
          {t('notFoundCta')}
        </Link>
      </div>
    </main>
  );
}
import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/seo';

/**
 * Aucune page du back-office ne déclare ses propres métadonnées : sans ce
 * layout, toutes hériteraient du titre ET du canonical de l'accueil (le
 * layout `[locale]` les couvre toutes). Le dashboard reste privé —
 * noindex ici, en plus du robots.txt.
 */
interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: DashboardLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/dashboard',
    noIndex: true,
  });
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <>{children}</>;
}

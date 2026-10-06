import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getProducts } from '@/lib/catalog';
import DropsList from './drops-list';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'drops' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function DropsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const products = await getProducts().catch(() => []);
  const featured = products.find((p) => p.isNewDrop) ?? products[0] ?? null;
  const archives = products.filter((p) => !p.isNewDrop).slice(0, 4);

  return <DropsList featured={featured} archives={archives} />;
}
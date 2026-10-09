import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildMetadata } from '@/lib/seo';
import LegalDocument from '@/components/storefront/LegalDocument';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.terms' });

  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/terms',
  });
}

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalDocument docKey="terms" />;
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getProductBySlug, getProducts } from '@/lib/catalog';
import SneakerProductDetail from '@/components/storefront/SneakerProductDetail';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);

  if (!product) return {};

  const t = await getTranslations({ locale, namespace: 'product' });

  return {
    title: t('metaTitle', { name: product.name }),
    description: t('metaDescription', {
      name: product.name,
      colorway: product.colorway,
    }),
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await getProductBySlug(slug).catch(() => null);

  if (!product) notFound();

  const related = (await getProducts().catch(() => []))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return <SneakerProductDetail product={product} related={related} />;
}
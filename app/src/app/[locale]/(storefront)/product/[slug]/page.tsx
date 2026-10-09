import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getProductBySlug, getProducts } from '@/lib/catalog';
import { getProductReviews } from '@/lib/reviews';
import { getSessionUser } from '@/lib/session';
import { SITE_NAME } from '@/lib/site';
import { breadcrumbSchema, buildMetadata, productSchema } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
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

  return buildMetadata({
    locale,
    title: t('metaTitle', { name: product.name }),
    description: t('metaDescription', {
      name: product.name,
      colorway: product.colorway,
    }),
    path: `/product/${slug}`,
    type: 'article',
    images: product.images.length > 0 ? product.images : undefined,
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await getProductBySlug(slug).catch(() => null);

  if (!product) notFound();

  const related = (await getProducts().catch(() => []))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const reviews = await getProductReviews(product.id).catch(() => []);
  const signedIn = (await getSessionUser().catch(() => null)) !== null;

  return (
    <>
      <JsonLd data={productSchema(product, locale)} />
      <JsonLd
        data={breadcrumbSchema(
          [
            { name: SITE_NAME, path: '' },
            { name: product.name, path: `/product/${product.slug}` },
          ],
          locale,
        )}
      />
      <SneakerProductDetail
        product={product}
        related={related}
        reviews={reviews}
        signedIn={signedIn}
      />
    </>
  );
}
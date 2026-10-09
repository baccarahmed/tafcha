import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getProducts } from '@/lib/catalog'
import { SITE_NAME } from '@/lib/site'
import { breadcrumbSchema, buildMetadata } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import ShopCatalog from './shop-catalog'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'shop' })

  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/shop',
  })
}

export default async function ShopPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const products = await getProducts().catch(() => [])
  const t = await getTranslations('shop')

  return (
    <>
      <JsonLd
        data={breadcrumbSchema(
          [
            { name: SITE_NAME, path: '' },
            { name: t('metaTitle'), path: '/shop' },
          ],
          locale,
        )}
      />
      <ShopCatalog products={products} />
    </>
  )
}
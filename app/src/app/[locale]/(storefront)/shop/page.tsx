import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getProducts } from '@/lib/catalog'
import ShopCatalog from './shop-catalog'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'shop' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function ShopPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const products = await getProducts().catch(() => [])

  return <ShopCatalog products={products} />
}
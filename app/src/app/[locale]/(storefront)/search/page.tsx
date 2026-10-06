import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getProducts } from '@/lib/catalog'
import SearchView from './search-view'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'search' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function SearchPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const products = await getProducts().catch(() => [])

  return <SearchView products={products} />
}

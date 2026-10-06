import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import FavoritesView from './favorites-view'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'favorites' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function FavoritesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <FavoritesView />
}
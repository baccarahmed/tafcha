/**
 * Helpers SEO réutilisables.
 *
 * Chaque page appelle `buildMetadata()` pour obtenir un `<title>`, une meta
 * description, une URL canonique, les alternates hreflang et les balises Open
 * Graph / Twitter cohérentes — sans dupliquer la logique.
 */

import type { Metadata } from 'next'
import { routing } from '@/i18n/routing'
import { absoluteUrl, SITE_NAME, SITE_NAME_LONG, SITE_URL } from './site'
import { STORE_CURRENCY } from './utils'
import type { CatalogProduct } from '@/types/catalog'

/** Image OG par défaut (logo PNG de la boutique). */
export const DEFAULT_OG_IMAGE = '/images/q2m/logo%20q2m.png'

/** Locale Open Graph à partir d'un code de langue. */
const OG_LOCALE: Record<string, string> = {
  fr: 'fr_FR',
  ar: 'ar_TN',
  en: 'en_US',
}

interface BuildMetadataArgs {
  /** Langue active (fr, ar, en). */
  locale: string
  title: string
  description: string
  /** Chemin SANS le préfixe de langue, ex : '/shop' ou '' pour l'accueil. */
  path?: string
  /** Images OG (chemins relatifs ou URL absolues). */
  images?: string[]
  type?: 'website' | 'article'
  noIndex?: boolean
}

/**
 * Construit les métadonnées communes à toutes les pages :
 * title, description, canonical, hreflang (fr/ar/en + x-default), OG et Twitter.
 */
export function buildMetadata({
  locale,
  title,
  description,
  path = '',
  images = [DEFAULT_OG_IMAGE],
  type = 'website',
  noIndex = false,
}: BuildMetadataArgs): Metadata {
  const canonical = absoluteUrl(`/${locale}${path}`)
  const ogImages = images.map((src) => (isAbsolute(src) ? src : absoluteUrl(src)))

  const languages: Record<string, string> = {}
  for (const code of routing.locales) {
    languages[code] = absoluteUrl(`/${code}${path}`)
  }
  languages['x-default'] = absoluteUrl(`/${routing.defaultLocale}${path}`)

  return {
    title,
    description,
    alternates: { canonical, languages },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale] ?? 'fr_FR',
      images: ogImages.map((url) => ({ url })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages,
    },
  }
}

function isAbsolute(src: string): boolean {
  return /^https?:\/\//.test(src)
}

/* -------------------------------------------------------------------------- */
/*                            Données structurées                             */
/* -------------------------------------------------------------------------- */

/** schema.org/Organization — émis une fois, sur tout le site. */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: SITE_NAME_LONG,
    url: SITE_URL,
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
  }
}

/** Statut d'offre schema.org à partir d'un produit du catalogue. */
function availability(product: CatalogProduct): string {
  const inStock = product.sizes.some((s) => s.stock > 0)
  return product.isSoldOut || !inStock
    ? 'https://schema.org/OutOfStock'
    : 'https://schema.org/InStock'
}

/** schema.org/Product — émis sur la fiche produit. */
export function productSchema(product: CatalogProduct, locale: string) {
  const images = (product.images.length > 0 ? product.images : [DEFAULT_OG_IMAGE]).map((src) =>
    isAbsolute(src) ? src : absoluteUrl(src),
  )

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: `${product.name}${product.colorway ? ` (${product.colorway})` : ''}`,
    image: images,
    sku: product.sku ?? product.slug,
    color: product.colorway || undefined,
    brand: { '@type': 'Brand', name: product.brand || SITE_NAME },
    ...(product.variants && product.variants.length > 1
      ? {
          hasVariant: product.variants.map((variant) => ({
            '@type': 'Product',
            name: `${product.name}${variant.colorway ? ` (${variant.colorway})` : ''}`,
            sku: variant.slug,
            color: variant.colorway || undefined,
            image: variant.image
              ? [isAbsolute(variant.image) ? variant.image : absoluteUrl(variant.image)]
              : undefined,
            url: absoluteUrl(`/${locale}/product/${variant.slug}`),
            offers: {
              '@type': 'Offer',
              url: absoluteUrl(`/${locale}/product/${variant.slug}`),
              price: Number(variant.price),
              priceCurrency: STORE_CURRENCY,
              availability: variant.isSoldOut
                ? 'https://schema.org/OutOfStock'
                : 'https://schema.org/InStock',
            },
          })),
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/${locale}/product/${product.slug}`),
      price: Number(product.price),
      priceCurrency: STORE_CURRENCY,
      availability: availability(product),
      itemCondition: 'https://schema.org/NewCondition',
    },
  }
}

/** schema.org/BreadcrumbList — pages catégorie et produit. */
export function breadcrumbSchema(items: { name: string; path: string }[], locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(`/${locale}${item.path}`),
    })),
  }
}
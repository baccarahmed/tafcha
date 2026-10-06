import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getSiteUrl } from '@/lib/utils';
import { getProducts } from '@/lib/catalog';

const STATIC_PATHS = ['', '/shop', '/drops', '/about', '/contact'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl().replace(/\/$/, '');
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}${path}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: path === '' ? 1 : 0.7,
      });
    }
  }

  const products = await getProducts().catch(() => []);

  for (const product of products) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${base}/${locale}/product/${product.slug}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  return entries;
}

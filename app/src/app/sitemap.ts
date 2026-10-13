import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { absoluteUrl } from '@/lib/site';
import { getAllProductSlugs } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

/** Toutes les URL localisées d'un chemin, pour les alternates hreflang. */
function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const code of routing.locales) {
    languages[code] = absoluteUrl(`/${code}${path}`);
  }
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllProductSlugs().catch(() => []);

  const paths: { path: string; priority: number }[] = [
    { path: '', priority: 1 },
    { path: '/shop', priority: 0.9 },
    { path: '/drops', priority: 0.8 },
    { path: '/about', priority: 0.6 },
    { path: '/contact', priority: 0.6 },
    { path: '/terms', priority: 0.3 },
    { path: '/privacy', priority: 0.3 },
    { path: '/cookies', priority: 0.3 },
    { path: '/returns', priority: 0.3 },
    ...slugs.map((slug) => ({
      path: `/product/${slug}`,
      priority: 0.8,
    })),
  ];

  return paths.map(({ path, priority }) => ({
    url: absoluteUrl(`/${routing.defaultLocale}${path}`),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority,
    alternates: { languages: languagesFor(path) },
  }));
}
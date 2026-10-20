import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Les URL réelles sont localisées (/fr/dashboard, /en/account…) :
        // la règle /dashboard seule ne les couvrirait pas. La variante
        // /*/… (wildcard Google/Bing) couvre toutes les locales.
        // login/register/favorites/search restent accessibles au crawl :
        // ils portent un meta noindex que Google doit pouvoir lire.
        disallow: [
          '/dashboard',
          '/*/dashboard',
          '/checkout',
          '/*/checkout',
          '/account',
          '/*/account',
          '/api/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

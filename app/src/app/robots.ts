import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/checkout', '/account', '/favorites', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, isRtl, type Locale } from '@/i18n/routing';
import { Providers } from '../providers';
import { SITE_URL } from '@/lib/site';
import { buildMetadata, organizationSchema } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import MetaPixel from '@/components/analytics/MetaPixel';
import CookieConsent from '@/components/consent/CookieConsent';
import '@/app/globals.css';

import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/syne/400.css';
import '@fontsource/syne/600.css';
import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'home' });
  return {
    // Base commune à toutes les URL relatives (canonical, Open Graph, etc.).
    metadataBase: new URL(SITE_URL),
    ...buildMetadata({
      locale,
      title: t('metaTitle'),
      description: t('metaDescription'),
      path: '',
    }),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f4f0' },
    { media: '(prefers-color-scheme: dark)', color: '#080909' },
  ],
};

/**
 * Applies the stored theme before first paint so the page never flashes the
 * wrong surface colour. Kept inline and synchronous on purpose.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : false;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const rtl = isRtl(locale as Locale);

  return (
    <html lang={locale} dir={rtl ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
          <JsonLd data={organizationSchema()} />
          <MetaPixel />
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
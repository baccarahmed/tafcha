import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { getSiteSettings } from '@/lib/catalog';
import CheckoutView from './checkout-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  // The [locale] layout already rejected unknown locales.
  const activeLocale = (hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale) as Locale;

  const user = await getSessionUser();

  // Une commande est rattachee a un compte : sans session on repasse par la
  // connexion, puis on revient ici (le panier est persiste côté navigateur).
  if (!user) {
    redirect({ href: '/login?next=/checkout', locale: activeLocale });
  }

  const settings = await getSiteSettings().catch(() => null);

  return (
    <CheckoutView
      initial={{
        fullName: [user.firstName, user.lastName].filter(Boolean).join(' '),
        email: user.email,
      }}
      freeShippingThreshold={Number(settings?.free_shipping_threshold_dnt) || 200}
      shippingCost={Number(settings?.shipping_cost_dnt) || 10}
    />
  );
}

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/session';
import { getSiteSettings } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import CheckoutView from './checkout-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });

  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/checkout',
    noIndex: true,
  });
}

export default async function CheckoutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Commande invitee : aucun compte n'est requis. On pre-remplit simplement le
  // formulaire quand une session existe, sinon les champs sont vides.
  const [user, settings] = await Promise.all([
    getSessionUser(),
    getSiteSettings().catch(() => null),
  ]);

  return (
    <CheckoutView
      initial={{
        fullName: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '',
        email: user?.email ?? '',
      }}
      freeShippingThreshold={Number(settings?.free_shipping_threshold_dnt) || 200}
      shippingCost={Number(settings?.shipping_cost_dnt) || 10}
    />
  );
}

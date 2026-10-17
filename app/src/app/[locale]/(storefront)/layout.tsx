import { StorefrontNavbar } from '@/components/storefront/StorefrontNavbar';
import { StorefrontFooter } from '@/components/storefront/StorefrontFooter';
import { StorefrontBottomNav } from '@/components/storefront/StorefrontBottomNav';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { MotionPageContainer } from '@/components/motion/motion-container';
import { getGenders, getSiteSettings } from '@/lib/catalog';
import { getSessionUser } from '@/lib/session';
import { listNotifications } from '@/lib/notifications';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Le panier ne doit pas tomber si `site_settings` est momentanement
  // injoignable : on garde les seuils par defaut plutot que de casser la vitrine.
  // Les genres viennent d'une requete legere (une colonne) : charger tout le
  // catalogue a chaque navigation n'etait pas necessaire pour la navbar.
  const [settings, genders, user] = await Promise.all([
    getSiteSettings().catch(() => null),
    getGenders().catch(() => []),
    getSessionUser().catch(() => null),
  ]);

  const notifications = user ? await listNotifications(user.id).catch(() => []) : [];

  const freeShippingThreshold =
    Number(settings?.free_shipping_threshold_dnt) || 200;
  const shippingCost = Number(settings?.shipping_cost_dnt) || 10;

  return (
    <>
      <StorefrontNavbar
        genders={genders}
        userId={user?.id ?? null}
        notifications={notifications}
      />
      <main className="min-h-screen">
        <MotionPageContainer>{children}</MotionPageContainer>
      </main>
      <CartDrawer
        freeShippingThreshold={freeShippingThreshold}
        shippingCost={shippingCost}
      />
      <StorefrontFooter />
      <StorefrontBottomNav />
    </>
  );
}
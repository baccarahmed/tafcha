import { StorefrontNavbar } from '@/components/storefront/StorefrontNavbar';
import { StorefrontFooter } from '@/components/storefront/StorefrontFooter';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { MotionPageContainer } from '@/components/motion/motion-container';
import { getProducts, getSiteSettings } from '@/lib/catalog';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Le panier ne doit pas tomber si `site_settings` est momentanement
  // injoignable : on garde les seuils par defaut plutot que de casser la vitrine.
  const [settings, products] = await Promise.all([
    getSiteSettings().catch(() => null),
    getProducts().catch(() => []),
  ]);

  const freeShippingThreshold =
    Number(settings?.free_shipping_threshold_dnt) || 200;
  const shippingCost = Number(settings?.shipping_cost_dnt) || 10;

  // Un lien de navigation vers un genre sans produit ouvre une grille vide.
  const genders = Array.from(
    new Set(products.map((p) => p.gender).filter((g): g is NonNullable<typeof g> => Boolean(g)))
  );

  return (
    <>
      <StorefrontNavbar genders={genders} />
      <main className="min-h-screen">
        <MotionPageContainer>{children}</MotionPageContainer>
      </main>
      <CartDrawer
        freeShippingThreshold={freeShippingThreshold}
        shippingCost={shippingCost}
      />
      <StorefrontFooter />
    </>
  );
}
import { Q2MHero } from "@/components/storefront/Q2MHero";
import { Q2MManifesto } from "@/components/storefront/Q2MManifesto";
import { Q2MProductGrid } from "@/components/storefront/Q2MProductCard";
import { Q2MCategories } from "@/components/storefront/Q2MCategories";
import { Q2MBrandsAndDrop } from "@/components/storefront/Q2MBrandsAndDrop";
import { Q2MBenefits } from "@/components/storefront/Q2MBenefits";
import { Q2MOrbitGallery } from "@/components/storefront/Q2MOrbitGallery";
import { Q2MNewsletter } from "@/components/storefront/Q2MNewsletter";
import { getTranslations } from "next-intl/server";
import { getProducts } from "@/lib/catalog";
import { getSiteSettings } from "@/lib/admin-settings";

export default async function HomePage() {
  const t = await getTranslations("home");
  const products = await getProducts().catch(() => []);
  const galleryImages = await getSiteSettings()
    .then((settings) => settings.galleryImages)
    .catch(() => []);
  const newDrops = products.filter((p) => p.isNewDrop).slice(0, 4);
  const bestSellers = products.filter((p) => p.featured).slice(0, 4);

  const genders = Array.from(
    new Set(
      products.map((p) => p.gender).filter((g): g is NonNullable<typeof g> => Boolean(g))
    )
  );

  const showcase = (fallback: typeof products) =>
    fallback.length > 0 ? fallback : products.slice(0, 4);

  return (
    <main>
      <Q2MHero />
      <Q2MManifesto />
      {newDrops.length > 0 && (
        <Q2MProductGrid
          eyebrow={t('newEyebrow')}
          title={t('newTitle')}
          link={{ href: "/shop", label: t('viewAll') }}
          products={showcase(newDrops)}
        />
      )}
      <Q2MCategories genders={genders} />
      <Q2MBrandsAndDrop />
      {bestSellers.length > 0 && (
        <Q2MProductGrid
          eyebrow={t('bestSellerEyebrow')}
          title={t('bestSellerTitle')}
          link={{ href: "/shop", label: t('viewAll') }}
          products={showcase(bestSellers)}
        />
      )}
      <Q2MBenefits />
      <Q2MOrbitGallery images={galleryImages} />
      <Q2MNewsletter />
    </main>
  );
}
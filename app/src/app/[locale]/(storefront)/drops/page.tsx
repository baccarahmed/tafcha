import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getDrops, getProducts } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import type { CatalogProduct } from '@/types/catalog';
import DropsList, { type DropRow, type DropStatus } from './drops-list';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'drops' });

  return buildMetadata({
    locale,
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/drops',
  });
}

/** Statut du drop dérivé des vraies dates catalogue (release + fin de vente). */
function dropStatus(product: CatalogProduct, now: number): DropStatus {
  const release = product.releaseDate ? new Date(product.releaseDate).getTime() : 0;
  const ends = product.dropEndsAt
    ? new Date(product.dropEndsAt).getTime()
    : Number.POSITIVE_INFINITY;

  if (release > now) return 'upcoming';
  if (ends <= now) return 'ended';
  return 'live';
}

const stockOf = (product: CatalogProduct): number =>
  product.sizes.reduce((sum, size) => sum + Number(size.stock), 0);

const RANK: Record<DropStatus, number> = { live: 0, upcoming: 1, ended: 2 };

export default async function DropsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // « Maintenant » est évalué à chaque requête (page dynamique) : le statut
  // live/upcoming/ended d'un drop ne doit pas être figé au build.
  // eslint-disable-next-line react-hooks/purity -- horloge serveur délibérée
  const now = Date.now();

  const [drops, products] = await Promise.all([
    getDrops(20)
      .then((rows) => rows as unknown as CatalogProduct[])
      .catch(() => []),
    getProducts()
      .then((rows) => rows as unknown as CatalogProduct[])
      .catch(() => []),
  ]);

  const calendar: DropRow[] = drops
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      date: product.releaseDate ?? product.dropEndsAt ?? '',
      quantity: stockOf(product),
      status: dropStatus(product, now),
    }))
    .sort((a, b) => {
      if (a.status !== b.status) return RANK[a.status] - RANK[b.status];
      const dateA = a.date || '';
      const dateB = b.date || '';
      // « Ended » : du plus recent au plus ancien, les autres par ordre chronologique.
      return a.status === 'ended'
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    });

  const leadRow = calendar[0] ?? null;
  const featuredProduct = leadRow
    ? drops.find((product) => product.slug === leadRow.slug) ?? null
    : null;

  const countdownMs =
    leadRow && featuredProduct
      ? leadRow.status === 'live' && featuredProduct.dropEndsAt
        ? new Date(featuredProduct.dropEndsAt).getTime()
        : leadRow.status === 'upcoming' && featuredProduct.releaseDate
          ? new Date(featuredProduct.releaseDate).getTime()
          : null
      : null;

  const featured = featuredProduct
    ? {
        product: featuredProduct,
        status: leadRow!.status,
        countdownMs,
      }
    : null;

  // Collection permanente : produits actifs hors calendrier de drops.
  const archives = products
    .filter((product) => !drops.some((drop) => drop.id === product.id))
    .slice(0, 4);

  return <DropsList featured={featured} calendar={calendar} archives={archives} />;
}
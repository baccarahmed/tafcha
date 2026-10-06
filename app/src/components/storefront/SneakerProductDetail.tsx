'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Heart,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import SneakerVisual from '@/components/storefront/SneakerVisual';
import { Q2MProductCard } from '@/components/storefront/Q2MProductCard';
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens';
import { formatCurrency, intlLocale } from '@/lib/utils';
import { addItem, openCart } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import type { SneakerPalette } from '@/types/product';
import type { CatalogProduct } from '@/types/catalog';

interface SneakerProductDetailProps {
  product: CatalogProduct;
  related?: CatalogProduct[];
}

const REVIEW_COUNT = 48;
const REVIEW_SCORE = 4.8;

/**
 * Ces trois avis et la fiche technique sont du contenu de demonstration.
 *
 * Les libelles vivent dans `messages/*.json` (`review1Author`, `detail1`…) :
 * les ecrire ici les figerait en francais sur les trois langues.
 */
const REVIEWS = [
  { authorKey: 'review1Author', bodyKey: 'review1Body' },
  { authorKey: 'review2Author', bodyKey: 'review2Body' },
  { authorKey: 'review3Author', bodyKey: 'review3Body' },
] as const;

const DETAIL_KEYS = [
  'detail1',
  'detail2',
  'detail3',
  'detail4',
  'detail5',
] as const;

const ASSURANCES = [
  { key: 'shipping', Icon: Truck },
  { key: 'authenticity', Icon: ShieldCheck },
  { key: 'returns', Icon: RotateCcw },
] as const;

/** 4 vues par défaut quand le produit n'a pas de photo (Figma : 4 vignettes). */
function buildViews(product: CatalogProduct): SneakerPalette[] {
  const base = [product.palette, product.hoverPalette ?? product.palette];
  return [...base, ...base];
}

export default function SneakerProductDetail({
  product,
  related = [],
}: SneakerProductDetailProps) {
  const t = useTranslations('product');
  const locale = useLocale();
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number | string | null>(null);

  const hasItem = useWishlistStore((s) => s.hasItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = hasItem(product.id);

  const views = useMemo(() => buildViews(product), [product]);
  const gallery = product.images.length > 0 ? product.images : views;
  const activeImage = product.images[imageIndex];

  const inStock = product.sizes.find((s) => s.stock > 0);

  const handleAddToCart = () => {
    if (!selectedSize || product.isSoldOut) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      palette: product.palette,
      slug: product.slug,
      size: selectedSize.toString(),
    });
    openCart();
  };

  const estimatedDelivery = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    // La date de livraison suit la langue active : « 12 décembre » en français,
    // « December 12 » en anglais, le 12 décembre en arabe.
    return date.toLocaleDateString(intlLocale(locale), {
      day: 'numeric',
      month: 'long',
    });
  }, [locale]);

  // « 4,8 » en français, « 4.8 » en anglais : la virgule décimale est locale.
  const reviewScore = useMemo(
    () =>
      new Intl.NumberFormat(intlLocale(locale), {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(REVIEW_SCORE),
    [locale]
  );

  return (
    <div style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      {/* Fil d'Ariane — bandeau blanc pleine largeur */}
      <div style={{ background: Q2M.bgElevated }}>
        <div className="mx-auto max-w-[1440px] px-12 py-3 lg:px-14">
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: Q2M.inkMute }}>
            {t('breadcrumbHome')} / {product.brand} / {product.name}
          </p>
        </div>
      </div>

      {/* Fiche produit — row, gap 38 */}
      <div className="mx-auto flex max-w-[1440px] flex-col gap-9.5 px-6 py-6 pb-14 lg:flex-row lg:px-14">
        {/* Galerie — miniatures 94px + vue principale 590px */}
        <div className="flex shrink-0 flex-row gap-3 lg:w-[780px]">
          <div className="hidden w-[94px] shrink-0 flex-col gap-2.5 lg:flex">
            {gallery.slice(0, 4).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setImageIndex(idx)}
                aria-label={t('viewAlt', { name: product.name, count: idx + 1 })}
                className="relative h-[92px] w-full overflow-hidden"
                style={{
                  borderRadius: 4,
                  border: `1px solid ${imageIndex === idx ? Q2M.ink : 'transparent'}`,
                  background: Q2M.bone,
                }}
              >
                {product.images[idx] ? (
                  <Image
                    src={product.images[idx]}
                    alt=""
                    fill
                    sizes="94px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <SneakerVisual variant={views[idx]} flipped={idx % 2 === 1} />
                )}
              </button>
            ))}
          </div>

          <div
            className="relative min-h-[420px] flex-1 overflow-hidden lg:h-[590px]"
            style={{ background: Q2M.bone, borderRadius: 8 }}
          >
            {activeImage ? (
              /*
                Pas de `priority` ici : combiné à `unoptimized`, Next.js
                conserve le premier `src` chargé et la galerie ne change plus
                d'image au clic sur une vignette. Le visuel est déjà dans le
                bucket public, le préchargement n'apporte rien.
              */
              <Image
                key={activeImage}
                src={activeImage}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 620px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <SneakerVisual variant={views[imageIndex]} flipped={imageIndex % 2 === 1} />
            )}

            {product.isNewDrop && !product.isSoldOut && (
              <span
                className="absolute left-3.5 top-3.5 px-2.5 text-[9px] font-extrabold uppercase tracking-[0.16em]"
                style={{ background: Q2M.accent, color: Q2M.onAccent, borderRadius: 4 }}
              >
                {t('newDrop')}
              </span>
            )}
            {product.isSoldOut && (
              <span
                className="absolute left-3.5 top-3.5 px-2.5 text-[9px] font-extrabold uppercase tracking-[0.16em]"
                style={{ background: Q2M.bgDark, color: '#FFFFFF', borderRadius: 4 }}
              >
                {t('soldOut')}
              </span>
            )}
          </div>
        </div>

        {/* Colonne Achat — 510px */}
        <div className="flex min-w-0 flex-1 flex-col gap-4.5">
          {/* Marque + favori */}
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-extrabold uppercase tracking-[0.16em]"
              style={{ color: Q2M.accentText }}
            >
              {product.brand}
            </span>
            <button
              type="button"
              aria-label={t('addToWishlist')}
              onClick={() =>
                toggleItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  palette: product.palette,
                  slug: product.slug,
                })
              }
              className="transition-opacity hover:opacity-70"
              style={{ color: isInWishlist ? Q2M.accent : Q2M.inkMute }}
            >
              <Heart size={20} strokeWidth={1.5} fill={isInWishlist ? 'currentColor' : 'none'} />
            </button>
          </div>

          <h1
            className="text-[clamp(32px,3vw,42px)] font-black uppercase leading-none tracking-[-0.01em]"
            style={{ color: Q2M.ink }}
          >
            {product.name}
          </h1>

          <p className="text-xs" style={{ color: Q2M.inkMute }}>
            {t('sku')} {product.sku ?? product.slug.toUpperCase()}
          </p>

          <p className="text-[28px] font-black tabular-nums" style={{ color: Q2M.ink }}>
            {formatCurrency(product.price, locale)}
          </p>

          <div className="h-px w-full" style={{ background: Q2M.line }} />

          {/* Couleur */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-extrabold" style={{ color: Q2M.ink }}>
              {t('colorLabel', { colorway: product.colorway })}
            </span>
            <div className="flex gap-2">
              {[Q2M.bgDark, Q2M.bgElevated, Q2M.accent, Q2M.line].map((swatch, i) => (
                <span
                  key={swatch + i}
                  className="h-6 w-6"
                  style={{
                    background: swatch,
                    borderRadius: "999px",
                    border: `1px solid ${Q2M.line}`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Pointure */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold" style={{ color: Q2M.ink }}>
                {t('selectSize')}
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: Q2M.ink }}>
                {t('sizeGuide')}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {product.sizes.map(({ size, stock }) => {
                const soldOut = stock === 0;
                const selected = selectedSize === size;
                return (
                  <button
                    key={String(size)}
                    type="button"
                    disabled={soldOut}
                    onClick={() => setSelectedSize(size)}
                    className="h-[42px] w-[54px] rounded text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35"
                    style={{
                      background: selected ? Q2M.bgDark : Q2M.bgElevated,
                      color: selected ? '#FFFFFF' : Q2M.inkMute,
                      border: `1px solid ${selected ? Q2M.accent : Q2M.lineStrong}`,
                    }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            <p className="flex items-center gap-2 text-xs" style={{ color: Q2M.inkMute }}>
              {inStock ? (
                <>
                  <span
                    className="inline-block h-[7px] w-[7px]"
                    style={{ background: '#1D8A55', borderRadius: "999px" }}
                  />
                  {t('inStockDelivery', { date: estimatedDelivery })}
                </>
              ) : (
                t('soldOut')
              )}
            </p>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!selectedSize || product.isSoldOut}
            className="q2m-btn-primary h-[54px] w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingBag size={15} strokeWidth={1.5} />
            {product.isSoldOut
              ? t('soldOut')
              : `${t('addToCart')} — ${formatCurrency(product.price, locale)}`}
          </button>

          {/* Réassurances */}
          <div className="flex flex-col gap-2.5 pt-1">
            {ASSURANCES.map(({ key, Icon }) => (
              <div key={key} className="flex items-center gap-2.5">
                <Icon size={18} strokeWidth={1.5} style={{ color: Q2M.ink }} />
                <span className="text-xs" style={{ color: Q2M.ink }}>
                  {t(key)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Description et détails — fond blanc, 2 colonnes */}
      <section style={{ background: Q2M.bgElevated }}>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-15 px-12 py-13 lg:flex-row lg:px-14">
          <div className="flex flex-1 flex-col gap-4">
            <h2
              className="text-[clamp(28px,2.2vw,28px)] font-black uppercase leading-[1.21]"
              style={{ color: Q2M.ink }}
            >
              {t('storyTitle')}
            </h2>
            <p className="text-sm leading-[1.75]" style={{ color: Q2M.inkMute }}>
              {t('story', { name: product.name, colorway: product.colorway })}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <h2 className="text-xl font-extrabold" style={{ color: Q2M.ink }}>
              {t('detailsTitle')}
            </h2>
            <ul className="flex flex-col">
              {DETAIL_KEYS.map((detailKey) => (
                <li key={detailKey} className="text-xs leading-8" style={{ color: Q2M.inkMute }}>
                    • {t(detailKey)}
                </li>
              ))}
              <li className="text-xs leading-8" style={{ color: Q2M.inkMute }}>
                • {t('styleCode', { code: (product.sku ?? product.slug).toUpperCase() })}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Vous aimerez aussi */}
      {related.length > 0 && (
        <section>
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6.5 px-12 py-13 lg:px-14">
            <div className="flex flex-col gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: Q2M.accentText }}
              >
                {t('relatedEyebrow')}
              </span>
              <h2
                className="text-[clamp(32px,2.8vw,42px)] font-black uppercase leading-[1.21]"
                style={{ color: Q2M.ink }}
              >
                {t('relatedTitle')}
              </h2>
            </div>
            <RelatedGrid products={related} />
          </div>
        </section>
      )}

      {/* Avis — fond beige */}
      <section style={{ background: Q2M.bone }}>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-12 py-13 lg:px-14">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: Q2M.accentText }}
              >
                {t('verifiedReviews', { count: REVIEW_COUNT })}
              </span>
              <h2
                className="text-[clamp(32px,2.8vw,42px)] font-black uppercase leading-[1.21]"
                style={{ color: Q2M.ink }}
              >
                {reviewScore} / 5
              </h2>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-opacity hover:opacity-60"
              style={{ color: Q2M.ink }}
            >
              {t('leaveReview')}
              <ArrowUpRight size={14} strokeWidth={1.5} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {REVIEWS.map((review) => (
              <motion.div
                key={review.authorKey}
                whileHover={{ y: -4 }}
                className="flex flex-col gap-3 p-4.5"
                style={{ background: Q2M.bgElevated, borderRadius: 8 }}
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} fill={Q2M.accent} style={{ color: Q2M.accent }} />
                  ))}
                </div>
                <span className="text-xs font-bold" style={{ color: Q2M.ink }}>
                  {t(review.authorKey)}
                </span>
                <p className="text-xs leading-relaxed" style={{ color: Q2M.inkMute }}>
                  {t(review.bodyKey)}
                </p>
                <span
                  className="w-fit px-2.5 text-[9px] font-extrabold uppercase tracking-[0.16em]"
                  style={{ background: Q2M.boneSoft, color: Q2M.inkMute, borderRadius: 4 }}
                >
                  {t('verifiedPurchase')}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function RelatedGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4.5 gap-y-7 md:grid-cols-4 md:gap-x-[18px]">
      {products.map((product) => (
        <Q2MProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
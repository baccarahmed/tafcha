'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
import { trackAddToCart, trackViewContent } from '@/lib/metaPixel';
import { addItem, openCart } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { createReviewAction, type ReviewActionState } from '@/app/actions/reviews';
import type { ProductReview } from '@/lib/reviews';
import type { SneakerPalette } from '@/types/product';
import type { CatalogProduct } from '@/types/catalog';

interface SneakerProductDetailProps {
  product: CatalogProduct;
  related?: CatalogProduct[];
  reviews?: ProductReview[];
  signedIn?: boolean;
}

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

const REVIEW_ERROR_KEYS: Record<NonNullable<ReviewActionState['error']>, string> = {
  invalid: 'reviewErrorInvalid',
  auth: 'reviewErrorAuth',
  notPurchased: 'reviewErrorNotPurchased',
  already: 'reviewErrorAlready',
  failed: 'reviewErrorFailed',
};

/** 4 vues par défaut quand le produit n'a pas de photo (Figma : 4 vignettes). */
function buildViews(product: CatalogProduct): SneakerPalette[] {
  const base = [product.palette, product.hoverPalette ?? product.palette];
  return [...base, ...base];
}

export default function SneakerProductDetail({
  product,
  related = [],
  reviews = [],
  signedIn = false,
}: SneakerProductDetailProps) {
  const t = useTranslations('product');
  const locale = useLocale();
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<number | string | null>(null);

  const wishlistItems = useWishlistStore((s) => s.items);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = wishlistItems.some((item) => item.productId === product.id);

  const views = useMemo(() => buildViews(product), [product]);
  const gallery = product.images.length > 0 ? product.images : views;
  const activeImage = product.images[imageIndex];

  const inStock = product.sizes.find((s) => s.stock > 0);

  // Meta Pixel — « ViewContent » une fois par fiche affichée.
  useEffect(() => {
    trackViewContent({ id: product.id, name: product.name, value: product.price });
  }, [product.id, product.name, product.price]);

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
    trackAddToCart({ id: product.id, name: product.name, value: product.price });
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
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  const reviewScore = useMemo(
    () =>
      new Intl.NumberFormat(intlLocale(locale), {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(averageRating),
    [averageRating, locale]
  );

  return (
    <div style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      {/* Fil d'Ariane — bandeau blanc pleine largeur */}
      <div style={{ background: Q2M.bgElevated }}>
        <div className="mx-auto max-w-[1440px] px-5 py-3 sm:px-10 lg:px-14">
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: Q2M.inkMute }}>
            {t('breadcrumbHome')} / {product.brand} / {product.name}
          </p>
        </div>
      </div>

      {/* Fiche produit — row, gap 38 */}
      <div className="mx-auto flex max-w-[1440px] flex-col gap-9.5 px-5 py-6 pb-14 sm:px-10 lg:flex-row lg:px-14">
        {/* Galerie — miniatures 94px + vue principale 590px */}
        <div className="flex shrink-0 flex-col gap-3 lg:w-[780px] lg:flex-row">
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

          {/* Vignettes — pile horizontale scrollable sur mobile */}
          <div className="q2m-scroll-x flex gap-2 overflow-x-auto lg:hidden">
            {gallery.slice(0, 4).map((_, idx) => (
              <button
                key={`m-${idx}`}
                type="button"
                onClick={() => setImageIndex(idx)}
                aria-label={t('viewAlt', { name: product.name, count: idx + 1 })}
                aria-pressed={imageIndex === idx}
                className="relative h-16 w-16 shrink-0 overflow-hidden transition-all active:scale-95"
                style={{
                  borderRadius: 4,
                  border: `1px solid ${imageIndex === idx ? Q2M.accent : Q2M.line}`,
                  background: Q2M.bone,
                }}
              >
                {product.images[idx] ? (
                  <Image
                    src={product.images[idx]}
                    alt=""
                    fill
                    sizes="64px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <SneakerVisual variant={views[idx]} flipped={idx % 2 === 1} />
                )}
              </button>
            ))}
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
              aria-label={isInWishlist ? t('removeFromWishlist') : t('addToWishlist')}
              onClick={() =>
                toggleItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  palette: product.palette,
                  slug: product.slug,
                })
              }
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 hover:bg-[var(--q2m-bone)] active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q2m-accent)]"
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
                    className={`h-[42px] w-[54px] rounded border text-sm transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q2m-accent)] disabled:cursor-not-allowed disabled:opacity-35 disabled:active:scale-100 ${
                      selected
                        ? 'border-[var(--q2m-accent)] bg-[var(--q2m-bg-dark)] font-bold text-white'
                        : 'border-[var(--q2m-line-strong)] bg-[var(--q2m-bg-elevated)] text-[var(--q2m-ink-mute)] hover:border-[var(--q2m-ink-mute)] hover:text-[var(--q2m-ink)]'
                    }`}
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
            className="q2m-btn-primary q2m-btn-lg q2m-btn-block"
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
        <div className="mx-auto flex max-w-[1440px] flex-col gap-15 px-5 py-13 sm:px-10 lg:flex-row lg:px-14">
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
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6.5 px-5 py-13 sm:px-10 lg:px-14">
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
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-13 sm:px-10 lg:px-14">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-col gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: Q2M.accentText }}
              >
                {t('verifiedReviews', { count: reviews.length })}
              </span>
              <h2
                className="text-[clamp(32px,2.8vw,42px)] font-black uppercase leading-[1.21]"
                style={{ color: Q2M.ink }}
              >
                {reviews.length > 0 ? `${reviewScore} / 5` : t('reviewNone')}
              </h2>
            </div>
            {signedIn ? (
              <ReviewForm productId={product.id} />
            ) : (
              <span className="text-xs" style={{ color: Q2M.inkMute }}>
                {t('reviewGuestNote')}
              </span>
            )}
          </div>

          {reviews.length === 0 ? (
            <p className="max-w-xl text-sm leading-relaxed" style={{ color: Q2M.inkMute }}>
              {t('reviewEmpty')}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {reviews.map((review) => (
                <motion.li
                  key={review.id}
                  whileHover={{ y: -4 }}
                  className="flex flex-col gap-3 p-4.5"
                  style={{ background: Q2M.bgElevated, borderRadius: 8 }}
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        fill={i < review.rating ? Q2M.accent : 'none'}
                        style={{ color: i < review.rating ? Q2M.accent : Q2M.lineStrong }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold" style={{ color: Q2M.ink }}>
                    {review.authorFirstName ?? t('reviewAnonymous')}
                  </span>
                  {review.comment && (
                    <p className="text-xs leading-relaxed" style={{ color: Q2M.inkMute }}>
                      {review.comment}
                    </p>
                  )}
                  <span
                    className="w-fit px-2.5 text-[9px] font-extrabold uppercase tracking-[0.16em]"
                    style={{ background: Q2M.boneSoft, color: Q2M.inkMute, borderRadius: 4 }}
                  >
                    {t('verifiedPurchase')}
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const t = useTranslations('product');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [state, formAction] = useActionState(createReviewAction, {
    ok: false,
    error: null,
  } satisfies ReviewActionState);

  // L'avis vient d'etre enregistre : on rafraichit le rendu serveur pour
  // afficher la liste a jour. Le formulaire disparait de lui-meme via le
  // `if (!state.ok)` du rendu ci-dessous.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const active = hovered || rating;

  return (
    <div className="flex w-full flex-col items-end gap-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group inline-flex items-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-all hover:text-[var(--q2m-accent-text)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
        style={{ color: Q2M.ink }}
        aria-expanded={open}
      >
        {open ? t('reviewFormCancel') : t('leaveReview')}
        <ArrowUpRight
          size={14}
          strokeWidth={1.5}
          className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100"
        />
      </button>

      {open && !state.ok && (
        <form
          action={formAction}
          className="flex w-full max-w-md flex-col gap-4 p-4.5"
          style={{ background: Q2M.bgElevated, borderRadius: 8 }}
        >
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="rating" value={rating} />

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: Q2M.inkMute }}>
              {t('reviewFormRating')}
            </span>
            <div className="flex gap-1" role="radiogroup" aria-label={t('reviewFormRating')}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value}/5`}
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHovered(value)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--q2m-accent)]"
                >
                  <Star
                    size={24}
                    fill={value <= active ? Q2M.accent : 'none'}
                    style={{ color: value <= active ? Q2M.accent : Q2M.lineStrong }}
                  />
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: Q2M.inkMute }}>
              {t('reviewFormComment')}
            </span>
            <textarea
              name="comment"
              rows={3}
              maxLength={600}
              placeholder={t('reviewFormPlaceholder')}
              className="resize-none border bg-transparent px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent"
              style={{ borderColor: Q2M.lineStrong }}
            />
          </label>

          {state.error && (
            <p
              role="alert"
              className="border px-4 py-3 text-xs font-semibold"
              style={{ borderColor: Q2M.alert, color: Q2M.alert }}
            >
              {t(REVIEW_ERROR_KEYS[state.error])}
            </p>
          )}

          <div className="flex justify-end">
            <ReviewSubmitButton disabled={rating === 0} />
          </div>
        </form>
      )}
    </div>
  );
}

function ReviewSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations('product');

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="q2m-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t('reviewFormSubmitting') : t('reviewFormSubmit')}
    </button>
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
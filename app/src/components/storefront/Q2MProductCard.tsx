"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Q2M, Q2M_FONT } from "@/lib/q2m-tokens";
import { formatCurrency } from "@/lib/utils";
import SneakerVisual from "@/components/storefront/SneakerVisual";
import { useWishlistStore } from "@/store/wishlist-store";
import type { CatalogProduct } from "@/types/catalog";
import type { SneakerPalette } from "@/types/product";

/** Pastille d'un coloris (carte) : rendu compact de sa palette. */
const PALETTE_SWATCH: Record<SneakerPalette, string> = {
  crimson: "#B3121C",
  ember: "#C2410C",
  void: "#111111",
  volt: "#C6FF00",
  onyx: "#2B2B2B",
};

/** Cles `shop.badge_*` resolues dans le composant. */
type TagKey = "badgeSale" | "badgeNew" | "badgeBestSeller" | "badgeRare" | null;

function getTag(p: CatalogProduct): TagKey {
  if (p.discountPercentage && p.discountPercentage > 0) return "badgeSale";
  if (p.isNewDrop) return "badgeNew";
  if (p.featured) return "badgeBestSeller";
  return null;
}

/**
 * CategorieSlug brut -> cle `shop.usage_*`.
 *
 * Le libelle vient des messages : un dictionnaire maison ici resterait fige en
 * francais quel que soit le choix de langue du visiteur.
 */
const USAGE_KEYS: Record<string, string> = {
  retro: "usage_retro",
  performance: "usage_running",
  running: "usage_running",
  lifestyle: "usage_lifestyle",
  sabots: "usage_sabots",
  sandals: "usage_sandals",
  collab: "usage_collab",
};

/** Figma card detail line: "Lifestyle • EU 36–45" */
function describeProduct(p: CatalogProduct, usage: string): string {
  const sizes = p.sizes
    .map((s) => Number(s.size))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (sizes.length === 0) return usage;
  return `${usage} • EU ${sizes[0]}–${sizes[sizes.length - 1]}`;
}

export function Q2MProductCard({
  product,
  index = 0,
  animatesIn = false,
}: {
  product: CatalogProduct;
  /** Position dans sa grille : pilote le ripple d'entrée (60 ms par colonne). */
  index?: number;
  /**
   * Anime l'apparition de la carte. Faux sur la première carte d'une grille
   * (elle doit être lisible au premier paint) et vrai pour les autres, y compris
   * lors d'un changement de filtre où `AnimatePresence` fournit le fondu de
   * sortie et la carte celui d'entrée.
   */
  animatesIn?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("shop");
  const tFav = useTranslations("favorites");
  const reduceMotion = useReducedMotion();
  const tag = getTag(product);
  const discounted =
    product.discountPercentage !== undefined &&
    product.discountPercentage > 0 &&
    product.comparePrice !== undefined &&
    product.comparePrice > product.price;

  const usageKey =
    USAGE_KEYS[product.categorySlug ?? ""] ?? USAGE_KEYS[product.category ?? ""];
  const usage = t(usageKey ?? "usage_lifestyle");

  const isFavorite = useWishlistStore((s) => s.items.some((i) => i.productId === product.id));
  const toggleItem = useWishlistStore((s) => s.toggleItem);

  /**
   * Deux animations distinctes, donc deux nœuds : `whileInView` sur l'enveloppe
   * (révélation au scroll, une seule fois) et le fondu d'échange sur l'article.
   * Les fusionner sur un seul nœud ferait écraser l'opacité du fondu par le
   * `whileInView` — la carte resterait invisible.
   */
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={
        reduceMotion
          ? { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
          : {
              duration: 0.55,
              ease: [0.23, 1, 0.32, 1],
              // Chaque rangée repart de zéro (modulo 4 = colonnes en desktop) :
              // un delay cumulé ferait attendre la 12e carte une demi-seconde.
              delay: (index % 4) * 0.06,
            }
      }
      className="group relative"
    >
      <motion.article
        initial={animatesIn ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.18 } }}
        transition={{
          duration: reduceMotion ? 0.15 : 0.28,
          ease: [0.23, 1, 0.32, 1],
          // Ripple en cascade sur l'entrée : les cartes arrivantes se posent
          // l'une après l'autre au lieu de clignoter ensemble.
          delay: animatesIn && !reduceMotion ? (index % 3) * 0.045 : 0,
        }}
        className="relative"
      >
      <Link href={`/product/${product.slug}`} className="block">
        {/* Image card — bone bg, padded inner frame, liseré or au survol */}
        <div
          className="relative aspect-[319/300] w-full overflow-hidden border border-transparent p-3.5 transition-[border-color] duration-200 ease-q2m group-hover:border-[var(--q2m-accent)]"
          style={{
            background: Q2M.bone,
            borderRadius: 8,
          }}
        >
          {tag && (
            <span
              className="absolute left-3.5 top-3.5 z-10 flex h-[25px] items-center px-2.5 text-[9px] font-extrabold tracking-[0.16em] uppercase"
              style={{
                background: Q2M.accent,
                color: Q2M.onAccent,
                borderRadius: 4,
              }}
            >
              {tag === "badgeSale" ? `-${product.discountPercentage}%` : t(tag)}
            </span>
          )}

          {product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 ease-q2m group-hover:scale-105"
            />
          ) : (
            <SneakerVisual variant={product.palette} />
          )}
        </div>

        {/* Product details — Figma: brand+price row, name, detail */}
        <div className="mt-3 flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="text-[10px] font-bold tracking-[0.16em] uppercase text-[var(--q2m-ink-mute)] transition-colors duration-180 ease-q2m group-hover:text-[var(--q2m-accent-text)]"
            >
              {product.brand ?? "—"}
            </span>
            <span className="flex items-baseline gap-1.5">
              {discounted && (
                <span
                  className="text-[11px] font-medium tabular-nums line-through"
                  style={{ color: Q2M.inkStone }}
                >
                  {formatCurrency(product.comparePrice as number, locale)}
                </span>
              )}
              <span
                className="text-sm font-extrabold tabular-nums"
                style={{ color: discounted ? Q2M.alert : Q2M.ink }}
              >
                {formatCurrency(product.price, locale)}
              </span>
            </span>
          </div>
          <h3
            className="text-base font-extrabold leading-tight"
            style={{ color: Q2M.ink }}
          >
            {product.name}
          </h3>
          <p
            className="text-[12px] font-normal leading-tight"
            style={{ color: Q2M.inkMute }}
          >
            {describeProduct(product, usage)}
          </p>
          {product.variants && product.variants.length > 1 && (
            <div className="mt-1 flex items-center gap-1.5">
              {product.variants.map((variant) => (
                <span
                  key={variant.id}
                  title={variant.colorway}
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: PALETTE_SWATCH[variant.palette],
                    border:
                      variant.id === product.id
                        ? `1.5px solid ${Q2M.ink}`
                        : `1px solid ${Q2M.line}`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Link>

      <motion.button
        type="button"
        aria-label={isFavorite ? tFav('remove') : tFav('add')}
        aria-pressed={isFavorite}
        onClick={() =>
          toggleItem({
            productId: product.id,
            name: product.name,
            price: product.price,
            palette: product.palette,
            slug: product.slug,
            image: product.images[0],
          })
        }
        // Le remplissage du cœur change d'état : un pop court le rend lisible
        // sans raconter une histoire. `transform` en chaîne complète (et non les
        // shorthands scale/x/y) pour rester accéléré matériellement sous charge.
        animate={{
          transform: isFavorite && !reduceMotion ? "scale(1.16)" : "scale(1)",
        }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center transition-[border-color,color] duration-140 ease-q2m hover:border hover:border-[var(--q2m-accent)]"
        style={{
          background: Q2M.bgElevated,
          borderRadius: "999px",
          color: isFavorite ? Q2M.accent : Q2M.ink,
        }}
      >
        <Heart size={15} strokeWidth={1.5} fill={isFavorite ? Q2M.accent : "none"} />
      </motion.button>
      </motion.article>
    </motion.div>
  );
}

export function Q2MProductGrid({
  eyebrow: eyebrowText,
  title,
  link,
  products,
}: {
  eyebrow: string;
  title: string;
  link?: { href: string; label: string };
  products: CatalogProduct[];
}) {
  return (
    <section className="w-full" style={{ background: Q2M.bg }}>
      <div
        className="mx-auto flex max-w-[1440px] flex-col gap-7.5 px-5 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20"
        style={{ fontFamily: Q2M_FONT }}
      >
        {/* Section header */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-2">
            <span
              className="text-[10px] font-bold tracking-[0.16em] uppercase"
              style={{ color: Q2M.accentText }}
            >
              {eyebrowText}
            </span>
            <h2
              className="max-w-full text-[clamp(28px,7vw,42px)] font-black leading-[1.21] uppercase break-words"
              style={{ color: Q2M.ink, letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
          </div>
          {link && (
            <Link
              href={link.href}
              className="group inline-flex shrink-0 items-center gap-2 py-2.5 text-[10px] font-bold tracking-[0.16em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
              style={{ color: Q2M.ink }}
            >
              {link.label}
              <ArrowUpRight
                size={14}
                className="transition-transform duration-140 ease-q2m group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100"
              />
            </Link>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-4 lg:gap-x-[18px]">
          {products.map((product, index) => (
            <Q2MProductCard
              key={product.id}
              product={product}
              index={index}
              animatesIn={index > 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Q2M, Q2M_FONT } from "@/lib/q2m-tokens";
import { formatCurrency } from "@/lib/utils";
import SneakerVisual from "@/components/storefront/SneakerVisual";
import { useWishlistStore } from "@/store/wishlist-store";
import type { CatalogProduct } from "@/types/catalog";

/** Cles `shop.badge_*` resolues dans le composant. */
type TagKey = "badgeNew" | "badgeBestSeller" | "badgeRare" | null;

function getTag(p: CatalogProduct): TagKey {
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

export function Q2MProductCard({ product }: { product: CatalogProduct }) {
  const locale = useLocale();
  const t = useTranslations("shop");
  const tFav = useTranslations("favorites");
  const tag = getTag(product);

  const usageKey =
    USAGE_KEYS[product.categorySlug ?? ""] ?? USAGE_KEYS[product.category ?? ""];
  const usage = t(usageKey ?? "usage_lifestyle");

  const isFavorite = useWishlistStore((s) => s.items.some((i) => i.productId === product.id));
  const toggleItem = useWishlistStore((s) => s.toggleItem);

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55 }}
      className="group relative"
    >
      <Link href={`/product/${product.slug}`} className="block">
        {/* Image card — bone bg, padded inner frame */}
        <div
          className="relative aspect-[319/300] w-full overflow-hidden p-3.5"
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
              {tag && t(tag)}
            </span>
          )}

          {product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              unoptimized
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <SneakerVisual variant={product.palette} />
          )}
        </div>

        {/* Product details — Figma: brand+price row, name, detail */}
        <div className="mt-3 flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="text-[10px] font-bold tracking-[0.16em] uppercase"
              style={{ color: Q2M.inkMute }}
            >
              {product.brand ?? "—"}
            </span>
            <span
              className="text-sm font-extrabold tabular-nums"
              style={{ color: Q2M.ink }}
            >
              {formatCurrency(product.price, locale)}
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
        </div>
      </Link>

      <button
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
          })
        }
        className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center"
        style={{
          background: Q2M.bgElevated,
          borderRadius: "999px",
          color: isFavorite ? Q2M.accent : Q2M.ink,
        }}
      >
        <Heart size={15} strokeWidth={1.5} fill={isFavorite ? Q2M.accent : "none"} />
      </button>
    </motion.article>
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
        className="mx-auto flex max-w-[1440px] flex-col gap-7.5 px-12 py-16 lg:px-14 lg:py-20"
        style={{ fontFamily: Q2M_FONT }}
      >
        {/* Section header */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-bold tracking-[0.16em] uppercase"
              style={{ color: Q2M.accentText }}
            >
              {eyebrowText}
            </span>
            <h2
              className="text-[42px] font-black leading-[1.21] uppercase"
              style={{ color: Q2M.ink, letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
          </div>
          {link && (
            <Link
              href={link.href}
              className="group inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] uppercase transition-colors"
              style={{ color: Q2M.ink }}
            >
              {link.label}
              <ArrowUpRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-4 lg:gap-x-[18px]">
          {products.map((product) => (
            <Q2MProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
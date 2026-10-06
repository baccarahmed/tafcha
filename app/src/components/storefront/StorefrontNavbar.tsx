"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Heart,
  Search,
  ShoppingBag,
  User,
  Menu,
  X,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { Q2M, Q2M_FONT, NAV_LINKS, GENDER_NAV_LINKS, Q2M_BRAND_IMAGES } from "@/lib/q2m-tokens";
import { ThemeToggle } from "@/components/storefront/ThemeToggle";
import { LanguageSwitcher } from "@/components/storefront/LanguageSwitcher";

/**
 * Chrome noir #000000 dans les deux modes : la barre ne dépend jamais du thème,
 * donc les couleurs de texte/icônes sont figées (crème + or au survol) au lieu
 * de suivre les tokens `ink` qui basculent entre clair et sombre.
 */
const CHROME_TEXT = "text-[var(--q2m-on-dark-soft)]";
const CHROME_HOVER =
  "transition-colors hover:text-[var(--q2m-accent)] focus-visible:text-[var(--q2m-accent)]";

export function StorefrontNavbar({ genders = [] }: { genders?: string[] }) {
  const [open, setOpen] = useState(false);
  const logoSrc = Q2M_BRAND_IMAGES.logoOnBlack;
  const totalItems = useCartStore((s) => s.totalItems);
  const openCart = useCartStore((s) => s.openCart);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const t = useTranslations("nav");
  const tShop = useTranslations("shop");

  /**
   * Gender facets offered in the header; only those with products are kept.
   *
   * Les libelles sont resolus ici : la liste de liens ne porte que des cles, et
   * le menu suit la langue active au lieu d'afficher du francais fige.
   */
  const links = [
    ...NAV_LINKS.slice(0, 2).map((link) => ({
      label: t(link.labelKey),
      href: link.href,
    })),
    ...GENDER_NAV_LINKS.filter((link) => genders.includes(link.gender)).map(
      (link) => ({
        label: tShop(`gender_${link.gender}`),
        href: `/shop?gender=${link.gender}`,
      })
    ),
    ...NAV_LINKS.slice(2).map((link) => ({
      label: t(link.labelKey),
      href: link.href,
    })),
  ];

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const tools = [
    { icon: Search, label: t("search"), href: "/search", count: 0 },
    { icon: Heart, label: t("wishlist"), href: "/favorites", count: wishlistCount },
    { icon: User, label: t("account"), href: "/account", count: 0 },
  ];

  return (
    <>
      {/* Promo bar — Figma: gold bg, black uppercase 10px tracking */}
      <div
        className="w-full flex items-center justify-center gap-8 px-12 py-3.5 text-center"
        style={{
          background: Q2M.accent,
          color: Q2M.onAccent,
          fontFamily: Q2M_FONT,
        }}
        role="region"
        aria-label={t("promo")}
      >
        <span className="text-[10px] font-bold tracking-[0.16em] uppercase whitespace-nowrap">
          {t("promo")}
        </span>
      </div>

      {/* Navigation — barre noire #000000 en clair comme en sombre */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "#000000",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-6 px-6 sm:px-12 lg:px-14"
          style={{ fontFamily: Q2M_FONT }}
        >
          {/* Logo officiel Q2M — JPG sur fond noir, fondu dans la barre */}
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label={Q2M.brand}
          >
            <Image
              src={logoSrc}
              alt={`${Q2M.brand} — ${Q2M.brandFull}`}
              width={48}
              height={48}
              priority
              unoptimized
              className="h-12 w-12 object-contain"
            />
          </Link>

          {/* Center: main nav links */}
          <nav className="hidden items-center gap-7 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`group relative text-[10px] font-bold tracking-[0.16em] uppercase ${CHROME_TEXT} ${CHROME_HOVER} after:absolute after:-bottom-2 after:left-0 after:h-px after:w-0 after:bg-[var(--q2m-accent)] after:transition-all after:duration-300 hover:after:w-full`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right: tools */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />

            {tools.map(({ icon: Icon, label, href, count }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className={`relative hidden h-10 w-10 items-center justify-center sm:flex ${CHROME_TEXT} ${CHROME_HOVER}`}
              >
                <Icon size={18} strokeWidth={1.5} />
                {count > 0 && (
                  <span
                    className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center text-[10px] font-black tabular-nums"
                    style={{
                      background: Q2M.accent,
                      color: Q2M.onAccent,
                      borderRadius: "999px",
                    }}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            ))}

            <button
              type="button"
              aria-label={t("cart")}
              onClick={openCart}
              className={`relative flex h-10 w-10 items-center justify-center ${CHROME_TEXT} ${CHROME_HOVER}`}
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {totalItems > 0 && (
                <span
                  className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center text-[10px] font-black tabular-nums"
                  style={{
                    background: Q2M.accent,
                    color: Q2M.onAccent,
                    borderRadius: "999px",
                  }}
                >
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </button>

            <button
              type="button"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              onClick={() => setOpen(!open)}
              className={`flex h-10 w-10 items-center justify-center lg:hidden ${CHROME_TEXT} ${CHROME_HOVER}`}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu — même noir que la barre */}
      {open && (
        <div
          className="fixed inset-x-0 top-[113px] bottom-0 z-40 overflow-y-auto lg:hidden"
          style={{ background: "#000000" }}
        >
          <nav
            className="flex flex-col px-6 py-10"
            style={{ fontFamily: Q2M_FONT }}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`border-b py-5 text-2xl font-black tracking-[0.16em] uppercase ${CHROME_TEXT} ${CHROME_HOVER}`}
                style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
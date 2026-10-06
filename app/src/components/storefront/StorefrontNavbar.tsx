"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
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

export function StorefrontNavbar({ genders = [] }: { genders?: string[] }) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const logoSrc = Q2M_BRAND_IMAGES.logo;
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

      {/* Navigation — transparent en light, #000000 en dark */}
      <header
        className="sticky top-0 z-50 w-full"
        style={isDark ? { background: "#000000" } : undefined}
      >
        <div
          className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-6 px-6 sm:px-12 lg:px-14"
          style={{ fontFamily: Q2M_FONT }}
        >
          {/* Logo officiel Q2M — couronne or/argent + cercle doré */}
          <Link href="/" className="flex shrink-0 items-center" aria-label={Q2M.brand}>
            <Image
              src={logoSrc}
              alt={`${Q2M.brand} — ${Q2M.brandFull}`}
              width={48}
              height={48}
              priority
              unoptimized
              className="q2m-logo h-[48px] w-[48px] object-contain object-[50%_25%]"
            />
          </Link>

          {/* Center: main nav links */}
          <nav className="hidden items-center gap-6 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[10px] font-bold tracking-[0.16em] uppercase transition-colors"
                style={{ color: Q2M.onDark }}
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
                className="relative hidden h-9 w-9 items-center justify-center transition-colors sm:flex"
                style={{ color: Q2M.onDark }}
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
              className="relative flex h-9 w-9 items-center justify-center transition-colors"
              style={{ color: Q2M.onDark }}
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
              className="flex h-9 w-9 items-center justify-center lg:hidden"
              style={{ color: Q2M.onDark }}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {open && (
        <div
          className="fixed inset-x-0 top-[112px] bottom-0 z-40 overflow-y-auto lg:hidden"
          style={{ background: Q2M.bgDark }}
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
                className="border-b py-4 text-2xl font-black tracking-[0.16em] uppercase transition-colors"
                style={{ color: Q2M.onDark, borderColor: Q2M.line }}
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
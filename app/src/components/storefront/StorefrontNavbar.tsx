"use client";

import { Link } from "@/i18n/navigation";
import { Q2MLogo } from "@/components/brand/Q2MLogo";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { Q2M, Q2M_FONT, NAV_LINKS, GENDER_NAV_LINKS } from "@/lib/q2m-tokens";
import { ThemeToggle } from "@/components/storefront/ThemeToggle";
import { LanguageSwitcher } from "@/components/storefront/LanguageSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { NotificationDTO } from "@/lib/notifications-types";

/**
 * Chrome noir #000000 dans les deux modes : la barre ne dépend jamais du thème,
 * donc les couleurs de texte/icônes sont figées (crème + or au survol) au lieu
 * de suivre les tokens `ink` qui basculent entre clair et sombre.
 */
const CHROME_TEXT = "text-[var(--q2m-on-dark-soft)]";
const CHROME_HOVER =
  "transition-colors duration-180 ease-q2m hover:text-[var(--q2m-accent)] focus-visible:text-[var(--q2m-accent)]";

export function StorefrontNavbar({
  genders = [],
  userId = null,
  notifications = [],
}: {
  genders?: string[];
  userId?: string | null;
  notifications?: NotificationDTO[];
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
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
      {/* Promo bar — noir chrome aligné sur le header, texte or (liseré blanc 8% pour séparer les deux barres noires) */}
      <div
        className="flex w-full items-center justify-center gap-8 overflow-hidden px-4 py-3.5 text-center"
        style={{
          background: "#000000",
          color: "var(--q2m-accent)",
          fontFamily: Q2M_FONT,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
        role="region"
        aria-label={t("promo")}
      >
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap">
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
          className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-10 lg:px-14"
          style={{ fontFamily: Q2M_FONT }}
        >
          {/* Emblème circulaire Q2M — badge noir + liseré or */}
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label={Q2M.brand}
          >
            <Q2MLogo size={52} priority />
          </Link>

          {/* Center: main nav links */}
          <nav className="hidden items-center gap-7 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`group relative text-[10px] font-bold tracking-[0.16em] uppercase ${CHROME_TEXT} ${CHROME_HOVER} after:absolute after:-bottom-2 after:left-0 after:h-px after:w-0 after:bg-[var(--q2m-accent)] after:transition-[width] after:duration-200 after:ease-q2m hover:after:w-full`}
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
                className={`relative hidden h-10 w-10 items-center justify-center rounded-full transition-transform duration-140 ease-q2m hover:scale-105 active:scale-95 sm:flex hover:bg-white/5 ${CHROME_TEXT} ${CHROME_HOVER}`}
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
              className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-140 ease-q2m hover:scale-105 active:scale-95 hover:bg-white/5 ${CHROME_TEXT} ${CHROME_HOVER}`}
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

            <NotificationBell userId={userId} initialNotifications={notifications} />

            <button
              type="button"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              aria-expanded={open}
              aria-controls="storefront-mobile-menu"
              onClick={() => setOpen(!open)}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-140 ease-q2m hover:scale-105 active:scale-95 hover:bg-white/5 lg:hidden ${CHROME_TEXT} ${CHROME_HOVER}`}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu — même noir que la barre. Il pousse depuis la barre (son
          déclencheur) et repart par le haut, jamais par un autre bord. */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="storefront-mobile-menu"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={
              reduceMotion
                ? { duration: 0.15, ease: "easeOut" }
                : { duration: 0.24, ease: [0.23, 1, 0.32, 1] }
            }
            className="fixed inset-x-0 top-[113px] bottom-0 z-40 overflow-y-auto lg:hidden"
            style={{ background: "#000000" }}
          >
            <nav
              className="flex flex-col px-5 py-8"
              style={{ fontFamily: Q2M_FONT }}
            >
              {links.map((l, i) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`border-b py-5 text-2xl font-black tracking-[0.16em] uppercase ${CHROME_TEXT} ${CHROME_HOVER}`}
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    // Ripple d'entrée : décoratif, ne retarde jamais l'interaction
                    // (les liens restent cliquables pendant le décalage).
                    animation: reduceMotion
                      ? undefined
                      : `q2m-menu-item-in 0.32s cubic-bezier(0.23, 1, 0.32, 1) ${i * 0.04}s both`,
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
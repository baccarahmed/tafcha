"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Q2M, Q2M_FONT, Q2M_BRAND_IMAGES } from "@/lib/q2m-tokens";
import { STORE_CURRENCY } from "@/lib/utils";

export function StorefrontFooter() {
  const t = useTranslations("footer");
  const locale = useLocale();
  // Footer noir dans les deux modes : cadrage sombre du site + lisibilité
  // garantie des libellés crème (qui seraient invisibles sur fond clair).
  const logoSrc = Q2M_BRAND_IMAGES.logoOnBlack;

  // Les libelles sont des cles : le footer suit la langue active au lieu
  // d'afficher du francais quel que soit le choix de l'utilisateur.
  const columns = [
    {
      title: t("shop"),
      links: [
        { label: t("newIn"), href: "/shop" },
        { label: t("sneakers"), href: "/shop?category=sneakers" },
        { label: t("streetwear"), href: "/shop?category=running" },
        { label: t("accessories"), href: "/shop?category=sabots" },
      ],
    },
    {
      title: t("help"),
      links: [
        { label: t("shipping"), href: "/about" },
        { label: t("sizeGuide"), href: "/about" },
        { label: t("returns"), href: "/returns" },
        { label: t("faq"), href: "/about" },
      ],
    },
    {
      title: t("legal"),
      links: [
        { label: t("story"), href: "/about" },
        { label: t("contact"), href: "/contact" },
        { label: t("instagram"), href: "/about" },
      ],
    },
  ] as const;

  return (
    <footer
      className="w-full"
      style={{
        background: "#000000",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        color: Q2M.onDark,
        fontFamily: Q2M_FONT,
      }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-5 py-16 sm:px-10 lg:px-14">
        {/* Top: brand + columns */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-5 md:col-span-1">
            <Link href="/" aria-label={Q2M.brand}>
              <Image
                src={logoSrc}
                alt={`${Q2M.brand} — ${Q2M.brandFull}`}
                width={56}
                height={56}
                className="h-14 w-14 object-contain"
              />
            </Link>
            <p
              className="text-sm font-normal leading-relaxed"
              style={{ color: Q2M.onDarkSoft }}
            >
              {t("blurb")}
            </p>
          </div>

          {/* Columns */}
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-5">
              <h3
                className="text-[10px] font-bold tracking-[0.16em] uppercase"
                style={{ color: Q2M.accent }}
              >
                {col.title}
              </h3>
              <ul className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="inline-block py-1.5 text-sm font-normal transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
                        style={{ color: Q2M.onDarkSoft }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div
          className="h-px w-full"
          style={{ background: Q2M.line }}
          aria-hidden
        />

        {/* Bottom: copyright + legal */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p
            className="text-[10px] font-bold tracking-[0.16em] uppercase"
            style={{ color: Q2M.onDarkSoft }}
          >
            © 2026 {Q2M.brand}
          </p>
          <p
            className="flex flex-wrap items-center gap-3 text-[10px] font-bold tracking-[0.16em] uppercase"
            style={{ color: Q2M.onDarkSoft }}
          >
            <Link
              href="/terms"
              className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
            >
              {t("terms")}
            </Link>
            <span aria-hidden>•</span>
            <Link
              href="/privacy"
              className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
            >
              {t("privacy")}
            </Link>
            <span aria-hidden>•</span>
            <Link
              href="/cookies"
              className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
            >
              {t("cookies")}
            </Link>
            <span aria-hidden>•</span>
            <span style={{ color: Q2M.accent }}>
              {STORE_CURRENCY} / {locale.toUpperCase()}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
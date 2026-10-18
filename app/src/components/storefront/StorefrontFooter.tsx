"use client";

import { Link } from "@/i18n/navigation";
import { Q2MLogo } from "@/components/brand/Q2MLogo";
import { useLocale, useTranslations } from "next-intl";
import { Q2M, Q2M_FONT } from "@/lib/q2m-tokens";
import { STORE_CURRENCY } from "@/lib/utils";

const socialLinks = [
  {
    key: "instagram",
    href: "https://instagram.com",
    label: "Instagram",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    key: "facebook",
    href: "https://facebook.com",
    label: "Facebook",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    key: "whatsapp",
    href: "https://wa.me/21600000000",
    label: "WhatsApp",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
] as const;

export function StorefrontFooter() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const followUs = t("followUs");

  const columns = [
    {
      title: t("shop"),
      links: [
        { label: t("newIn"), href: "/shop" },
        { label: t("sneakers"), href: "/shop?category=sneakers" },
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
      title: t("account"),
      links: [
        { label: t("loginLink"), href: "/login" },
        { label: t("accountLink"), href: "/account" },
        { label: t("registerLink"), href: "/register" },
      ],
    },
    {
      title: t("legal"),
      links: [
        { label: t("story"), href: "/about" },
        { label: t("contact"), href: "/contact" },
      ],
    },
  ] as const;

  return (
    <footer
      className="w-full pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"
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
              <Q2MLogo size={56} />
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
                      className="inline-block py-1.5 text-sm font-normal transition-colors duration-180 ease-q2m hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
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

        {/* Social links with animations */}
        <div className="flex flex-col gap-4">
          <h3
            className="text-[10px] font-bold tracking-[0.16em] uppercase"
            style={{ color: Q2M.accent }}
          >
            {followUs}
          </h3>
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.key}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all duration-300 ease-out hover:scale-110 hover:border-[var(--q2m-accent)] hover:bg-[var(--q2m-accent)]/10 hover:text-[var(--q2m-accent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
                style={{ color: Q2M.onDarkSoft }}
              >
                {social.svg}
                {/* Tooltip */}
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-100">
                  {social.label}
                </span>
              </a>
            ))}
          </div>
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
              className="transition-colors duration-180 ease-q2m hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
            >
              {t("terms")}
            </Link>
            <span aria-hidden>•</span>
            <Link
              href="/privacy"
              className="transition-colors duration-180 ease-q2m hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
            >
              {t("privacy")}
            </Link>
            <span aria-hidden>•</span>
            <Link
              href="/cookies"
              className="transition-colors duration-180 ease-q2m hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--q2m-accent)]"
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

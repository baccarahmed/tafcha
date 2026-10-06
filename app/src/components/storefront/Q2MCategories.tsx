"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Q2M, Q2M_FONT, Q2M_BRAND_IMAGES } from "@/lib/q2m-tokens";

/** Le libellé vient du genre : pas de texte dans la configuration. */
const CATEGORY_VISUALS = [
  { gender: "homme", image: Q2M_BRAND_IMAGES.categoryHomme },
  { gender: "femme", image: Q2M_BRAND_IMAGES.categoryFemme },
  { gender: "enfant", image: Q2M_BRAND_IMAGES.categoryEnfant },
] as const;

/** Only genders that actually have products get a tile: the rest would dead-end. */
export function Q2MCategories({ genders = [] }: { genders?: string[] }) {
  const t = useTranslations("home");
  const tShop = useTranslations("shop");
  const tiles = CATEGORY_VISUALS.filter((cat) => genders.includes(cat.gender));

  if (tiles.length === 0) return null;
  return (
    <section className="w-full" style={{ background: Q2M.bg }}>
      <div
        className="mx-auto flex max-w-[1440px] flex-col gap-7.5 px-12 pb-16 lg:px-14 lg:pb-20"
        style={{ fontFamily: Q2M_FONT }}
      >
        {/* Section header */}
        <div className="flex flex-col gap-2">
          <span
            className="text-[10px] font-bold tracking-[0.16em] uppercase"
            style={{ color: Q2M.accentText }}
          >
            {t('categoriesKicker')}
          </span>
          <h2
            className="text-[42px] font-black leading-[1.21] uppercase"
            style={{ color: Q2M.ink, letterSpacing: "-0.01em" }}
          >
            {t('categoriesTitle')}
          </h2>
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {tiles.map((cat, i) => (
            <motion.div
              key={cat.gender}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
            >
              <Link
                href={`/shop?gender=${cat.gender}`}
                className="group relative block aspect-[4/5] w-full overflow-hidden"
                style={{ borderRadius: 4 }}
              >
                <Image
                  src={cat.image}
                  alt={tShop(`gender_${cat.gender}`)}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
                />
                <span
                  className="absolute bottom-7 left-7 text-4xl font-black uppercase tracking-[-0.02em]"
                  style={{ color: Q2M.onDark }}
                >
                  {tShop(`gender_${cat.gender}`)}
                </span>
                <span
                  className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: Q2M.accent,
                    color: Q2M.onAccent,
                    borderRadius: 4,
                  }}
                >
                  <ArrowUpRight size={18} strokeWidth={1.5} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
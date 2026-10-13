"use client";

import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens';

const STATS = [
  { value: "40+", label: "statCountries" },
  { value: "120K", label: "statPairs" },
  { value: "4.9", label: "statRating" },
  { value: "48H", label: "statShipping" },
] as const;

const PILLARS = ["1", "2", "3", "4"] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

export default function AboutPage() {
  const t = useTranslations("about");

  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pt-24 pb-16 text-center lg:px-14">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 text-[11px] font-extrabold tracking-[0.16em] text-[var(--q2m-accent-text)]"
        >
          {t("kicker")}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="mx-auto max-w-[20ch] text-4xl font-black leading-[1] tracking-[-0.02em] md:text-6xl"
        >
          {t("headlineLead")} <span className="text-accent">{t("headlineAccent")}</span>{" "}
          {t("headlineTail")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft"
        >
          {t("intro")}
        </motion.p>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pb-24 lg:px-14">
        <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: Q2M.line }}>
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="p-6 text-center"
              style={{ background: Q2M.bg }}
            >
              <p className="text-3xl font-black tabular-nums text-accent md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-[10px] font-bold tracking-[0.16em] text-ink-mute">
                {t(stat.label)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pb-24 lg:px-14">
        <div className="grid grid-cols-1 gap-px md:grid-cols-2" style={{ background: Q2M.line }}>
          {PILLARS.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
              className="flex gap-5 p-7"
              style={{ background: Q2M.bg }}
            >
              <span className="shrink-0 text-[10px] font-black tracking-[0.18em] text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">{t(`pillar${p}Title`)}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                  {t(`pillar${p}Body`)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 text-center"
        >
          <Link
            href="/shop"
            className="group q2m-btn-primary"
          >
            {t("shopCta")}
            <ArrowRight
              size={15}
              className="transition-transform duration-140 ease-q2m group-hover:translate-x-1 rtl:rotate-180"
            />
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
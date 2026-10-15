"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Q2M, Q2M_FONT, Q2M_BRAND_IMAGES } from "@/lib/q2m-tokens";

const DROP_TARGET = Date.UTC(2026, 11, 1, 20, 0, 0);

function remaining(now: number) {
  const diff = Math.max(0, DROP_TARGET - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

export function Q2MBrandsAndDrop() {
  const t = useTranslations("home");
  const tDrops = useTranslations("drops");
  const [time, setTime] = useState<ReturnType<typeof remaining> | null>(null);

  useEffect(() => {
    const tick = () => setTime(remaining(Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Les unites du compte a rebours sont des cles : « J » ne se dit pas « يوم ».
  const units = time
    ? ([
        [time.days, "days"],
        [time.hours, "hours"],
        [time.minutes, "minutes"],
        [time.seconds, "seconds"],
      ] as const)
    : null;

  return (
    <section className="w-full" style={{ background: Q2M.bg }}>
      <div
        className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-5 pb-14 sm:px-10 sm:pb-16 lg:grid-cols-2 lg:px-14 lg:pb-20"
        style={{ fontFamily: Q2M_FONT }}
      >
        {/* Brands panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-between gap-10 p-7 sm:p-10"
          style={{
            background: Q2M.bgElevated,
            borderRadius: 4,
          }}
        >
          <div className="flex flex-col gap-3">
            <span
              className="text-[10px] font-bold tracking-[0.16em] uppercase"
              style={{ color: Q2M.accentText }}
            >
              {t('brandsKicker')}
            </span>
            <h2
              className="text-[clamp(28px,7vw,42px)] font-black leading-[1.21] uppercase"
              style={{ color: Q2M.ink, letterSpacing: "-0.01em" }}
            >
              Nike / Adidas / Crocs
            </h2>
          </div>
          <p
            className="text-base font-normal leading-relaxed"
            style={{ color: Q2M.inkMute, maxWidth: 520 }}
          >
            {t('brandsBody')}
          </p>
          <Link href="/shop" className="group q2m-btn-ghost w-fit">
            {t('brandsCta')}
            <ArrowUpRight
              size={14}
              strokeWidth={1.5}
              className="transition-transform duration-140 ease-q2m group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100"
            />
          </Link>
        </motion.div>

        {/* Drop vedette panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative flex flex-col justify-end gap-6 overflow-hidden p-7 sm:p-10"
          style={{
            color: Q2M.onDark,
            borderRadius: 4,
          }}
        >
          <Image
            src={Q2M_BRAND_IMAGES.dropNightRun}
            alt="Q2M Night Run — drop privé"
            fill
            className="-z-0 object-cover"
          />
          <div
            className="absolute inset-0 -z-0"
            style={{
              background:
                "linear-gradient(155deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 100%)",
            }}
          />
          <div className="flex flex-col gap-2">
            <span
              className="text-[10px] font-extrabold tracking-[0.16em] uppercase"
              style={{ color: Q2M.accent }}
            >
              {t('dropBadge')}
            </span>
            <h2
              className="text-4xl font-black uppercase leading-none tracking-[-0.02em] sm:text-5xl"
            >
              Q2M NIGHT RUN
            </h2>
          </div>

          {/* Countdown */}
          <div className="flex flex-wrap items-center gap-2.5 font-black tabular-nums">
            {units
              ? units.map(([val, label], i) => (
                  <div
                    key={label}
                    className="flex items-baseline gap-1.5"
                  >
                    <span className="text-3xl sm:text-4xl">
                      {String(val).padStart(2, "0")}
                    </span>
                    <span
                      className="text-xs tracking-[0.16em] uppercase"
                      style={{ color: Q2M.accent }}
                    >
                      {tDrops(label)}
                    </span>
                    {i < units.length - 1 && (
                      <span style={{ color: Q2M.accent }}>:</span>
                    )}
                  </div>
                ))
              : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl">00</span>
                  <span
                    className="text-xs tracking-[0.16em] uppercase"
                    style={{ color: Q2M.accent }}
                  >
                    {tDrops('days')}
                  </span>
                  <span style={{ color: Q2M.accent }}>:</span>
                  <span className="text-3xl sm:text-4xl">00</span>
                  <span
                    className="text-xs tracking-[0.16em] uppercase"
                    style={{ color: Q2M.accent }}
                  >
                    {tDrops('hours')}
                  </span>
                </div>
              )}
          </div>

          <Link href="/drops" className="group q2m-btn-primary w-fit">
            {tDrops('notifyMe')}
            <ArrowUpRight
              size={14}
              strokeWidth={1.5}
              className="transition-transform duration-140 ease-q2m group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Q2M,
  Q2M_FONT,
  Q2M_BRAND_IMAGES,
  Q2M_BRAND_VIDEOS,
} from "@/lib/q2m-tokens";

export function Q2MHero() {
  const t = useTranslations("home");
  const videoRef = useRef<HTMLVideoElement>(null);
  const inViewRef = useRef(true);
  const [videoReady, setVideoReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // prefers-reduced-motion : on coupe la vidéo, l'image statique reste.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Lecture uniquement quand le hero est visible et l'onglet actif.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reducedMotion) {
      video.pause();
      video.currentTime = 0;
      return;
    }
    const tryPlay = () => {
      if (inViewRef.current && !document.hidden) video.play().catch(() => {});
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) tryPlay();
        else video.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(video);
    const onVisibility = () => {
      if (document.hidden) video.pause();
      else tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    tryPlay();
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion]);

  const videoVisible = videoReady && !reducedMotion;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        height: "clamp(540px, 82vh, 720px)",
        minHeight: 540,
        background: Q2M.bgDark,
        fontFamily: Q2M_FONT,
      }}
    >
      {/* Poster statique — premier paint immédiat + repli si la vidéo échoue */}
      <Image
        src={Q2M_BRAND_IMAGES.heroMain}
        alt="Q2M — hero sneakers premium"
        fill
        priority
        className="object-cover"
      />

      {/* Fond animé — unboxing (fade-in une fois le premier frame décodé) */}
      <video
        ref={videoRef}
        src={Q2M_BRAND_VIDEOS.heroUnboxing}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
        onCanPlay={() => setVideoReady(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-q2m ${
          videoVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Voile gauche Figma + scrim bas pour la lisibilité du bloc texte */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0.91) 0%, rgba(0,0,0,0.27) 65%, rgba(0,0,0,0.07) 100%), linear-gradient(0deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.18) 38%, rgba(0,0,0,0) 62%)",
        }}
      />

      {/* Top-left route index */}
      <div
        className="absolute left-5 top-4 z-10 lg:left-12 lg:top-9"
        style={{ color: Q2M.onDark }}
      >
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-[10px] font-extrabold tracking-[0.16em] uppercase"
            style={{ color: Q2M.accent }}
          >
            {t("heroRoute")}
          </span>
          <span className="text-[10px] font-normal tracking-[0.16em] uppercase">
            {t("heroCampaign")}
          </span>
        </div>
      </div>

      {/* Content bottom-left */}
      <div
        className="absolute bottom-0 left-0 z-10 flex flex-col gap-5 p-5 lg:p-12"
        style={{ maxWidth: 720 }}
      >
        {/* Badge drop */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex w-fit items-center gap-1.5 px-2.5"
          style={{
            background: Q2M.accent,
            color: Q2M.onAccent,
            height: 26,
            borderRadius: 4,
          }}
        >
          <span
            className="h-1.5 w-1.5"
            style={{ background: Q2M.onAccent, borderRadius: "999px" }}
          />
          <span className="text-[9px] font-black tracking-[0.16em] uppercase">
            {t("heroDropLive")}
          </span>
        </motion.div>

        {/* Mega title — Figma: Inter 900, 82px, line-height 0.86 */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-black uppercase"
          style={{
            fontSize: "clamp(34px, 8.5vw, 82px)",
            lineHeight: 0.86,
            letterSpacing: "-0.02em",
            color: Q2M.onDark,
          }}
        >
          {t("heroTitle")}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-base font-normal leading-relaxed"
          style={{ color: Q2M.onDarkSoft, maxWidth: 540 }}
        >
          {t("heroLede")}
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center gap-3 pt-2"
        >
          <Link
            href="/shop"
            className="group q2m-btn-primary"
          >
            {t("heroPrimary")}
            <ArrowUpRight
              size={15}
              strokeWidth={1.5}
              className="transition-transform duration-140 ease-q2m group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100"
            />
          </Link>
          <Link
            href="/shop"
            className="group q2m-btn-secondary"
          >
            {t("heroSecondary")}
            <ArrowUpRight
              size={15}
              strokeWidth={1.5}
              className="transition-transform duration-140 ease-q2m group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

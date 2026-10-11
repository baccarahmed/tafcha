"use client";

import { useTranslations } from "next-intl";
import { SpinShutter } from "@/components/ui/spin-shutter";
import {
  Q2M,
  Q2M_FONT,
  BENEFIT_KEYS,
  Q2M_USP_IMAGES,
} from "@/lib/q2m-tokens";

/**
 * Bandeau USP sous « Authenticité garantie » : les quatre mêmes promesses,
 * portées cette fois par un visuel qui se révèle sous un diaphragme
 * (`SpinShutter`). Les libellés viennent de `home.benefits.*`, déjà traduits
 * en FR / EN / AR, pour ne pas dupliquer le contenu.
 */
export function Q2MUspShutter() {
  const t = useTranslations("home");

  return (
    <section className="w-full" style={{ background: Q2M.bg }}>
      <div
        className="mx-auto flex max-w-[1440px] flex-col gap-7.5 px-5 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20"
        style={{ fontFamily: Q2M_FONT }}
      >
        <div className="flex flex-col gap-2">
          <span
            className="text-[10px] font-bold tracking-[0.16em] uppercase"
            style={{ color: Q2M.accentText }}
          >
            {t("processKicker")}
          </span>
          <h2
            className="text-[clamp(28px,7vw,42px)] font-black leading-[1.21] uppercase"
            style={{ color: Q2M.ink, letterSpacing: "-0.01em" }}
          >
            {t("processTitle")}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFIT_KEYS.map((key, i) => (
            <article key={key} className="group flex flex-col gap-4">
              <SpinShutter
                src={Q2M_USP_IMAGES[key]}
                alt={t(`benefits.${key}.title`)}
                delay={i * 0.08}
                className="aspect-[4/3] w-full"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
              <div className="flex flex-col gap-1.5">
                <span
                  className="text-[10px] font-bold tracking-[0.16em] uppercase tabular-nums"
                  style={{ color: Q2M.accentText }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3
                  className="text-base font-extrabold leading-snug"
                  style={{ color: Q2M.ink }}
                >
                  {t(`benefits.${key}.title`)}
                </h3>
                <p
                  className="text-sm font-normal leading-relaxed"
                  style={{ color: Q2M.inkMute }}
                >
                  {t(`benefits.${key}.body`)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Q2MUspShutter;

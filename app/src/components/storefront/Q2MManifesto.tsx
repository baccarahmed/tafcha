﻿"use client";

import { useTranslations } from "next-intl";
import { Q2M, Q2M_FONT, MANIFESTO_KEYS } from "@/lib/q2m-tokens";

const SEPARATOR = "◆";

export function Q2MManifesto() {
  const t = useTranslations("home");

  return (
    <section
      className="w-full overflow-hidden"
      style={{
        background: Q2M.bgDark,
        color: Q2M.onDark,
        fontFamily: Q2M_FONT,
      }}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-11 px-12 py-5 lg:px-14">
        {MANIFESTO_KEYS.map((key, i) => (
          <span
            key={key}
            className="flex items-center gap-11 text-[10px] font-bold tracking-[0.16em] uppercase whitespace-nowrap"
          >
            {i > 0 && (
              <span style={{ color: Q2M.accent }}>{SEPARATOR}</span>
            )}
            {t(`manifesto.${key}`)}
          </span>
        ))}
      </div>
    </section>
  );
}
"use client";

import {
  ShieldCheck,
  Truck,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Q2M, Q2M_FONT, BENEFIT_KEYS } from "@/lib/q2m-tokens";

const ICONS = [ShieldCheck, Truck, RotateCcw, MessageCircle];

export function Q2MBenefits() {
  const t = useTranslations("home");

  return (
    <section
      className="w-full"
      style={{ background: Q2M.bgDark, color: Q2M.onDark }}
    >
      <div
        className="mx-auto grid max-w-[1440px] grid-cols-1 gap-px px-12 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-14"
        style={{ background: Q2M.line, fontFamily: Q2M_FONT }}
      >
        {BENEFIT_KEYS.map((key, i) => {
          const Icon = ICONS[i];
          return (
            <div
              key={key}
              className="flex flex-col gap-4 p-7"
              style={{ background: Q2M.bgDark }}
            >
              <Icon size={22} strokeWidth={1.5} style={{ color: Q2M.accent }} />
              <h3 className="text-base font-extrabold leading-snug">
                {t(`benefits.${key}.title`)}
              </h3>
              <p
                className="text-sm font-normal leading-relaxed"
                style={{ color: Q2M.onDarkSoft }}
              >
                {t(`benefits.${key}.body`)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SneakerPalette } from "@/types/product";

type Variant = SneakerPalette;

const PALETTES: Record<Variant, { from: string; mid: string; to: string; glow: string }> = {
  crimson: { from: "#F97316", mid: "#EF4444", to: "#DC2626", glow: "rgba(239,68,68,0.30)" },
  ember: { from: "#FB923C", mid: "#F97316", to: "#EA580C", glow: "rgba(249,115,22,0.30)" },
  void: { from: "#6B7280", mid: "#374151", to: "#111827", glow: "rgba(107,114,128,0.28)" },
  volt: { from: "#FDE047", mid: "#F97316", to: "#DC2626", glow: "rgba(253,224,71,0.22)" },
  onyx: { from: "#9CA3AF", mid: "#4B5563", to: "#0A0A0A", glow: "rgba(156,163,175,0.24)" },
};

interface SneakerVisualProps {
  variant?: Variant;
  className?: string;
  /** Flips the shoe horizontally — useful to vary a grid of cards. */
  flipped?: boolean;
}

/**
 * Procedural sneaker illustration. Deterministic, dependency-free and
 * network-free, so the UI never depends on an external image host.
 */
export function SneakerVisual({ variant = "crimson", className, flipped = false }: SneakerVisualProps) {
  const t = useTranslations("product");
  const p = PALETTES[variant];
  const uid = `sv${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className={cn("relative flex h-full w-full items-center justify-center", className)}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 55%, ${p.glow} 0%, transparent 68%)`,
        }}
      />
      <svg
        viewBox="0 0 400 260"
        className={cn("relative w-[92%] drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]", flipped && "scale-x-[-1]")}
        role="img"
        aria-label={t('visualAlt')}
      >
        <defs>
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={p.from} />
            <stop offset="52%" stopColor={p.mid} />
            <stop offset="100%" stopColor={p.to} />
          </linearGradient>
          <linearGradient id={`${uid}-sole`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F2937" />
            <stop offset="55%" stopColor="#111111" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>
        </defs>

        {/* Contact shadow */}
        <ellipse cx="200" cy="222" rx="152" ry="10" fill="rgba(0,0,0,0.55)" />

        {/* Outsole */}
        <path
          d="M48 186 H352 a15 15 0 0 1 9 12 l-3 11 a12 12 0 0 1-11 8 H62 a15 15 0 0 1-14-11 l-7-11 a8 8 0 0 1 7-9 Z"
          fill={`url(#${uid}-sole)`}
        />
        {/* Neon midsole stripe */}
        <path d="M46 194 H360" stroke={p.mid} strokeWidth="3.5" opacity="0.95" strokeLinecap="round" />
        {/* Outsole tread */}
        <g stroke="#0A0A0A" strokeWidth="2.5" opacity="0.65" strokeLinecap="round">
          <path d="M78 206 L78 216" />
          <path d="M116 206 L116 216" />
          <path d="M154 206 L154 216" />
          <path d="M192 206 L192 216" />
          <path d="M230 206 L230 216" />
          <path d="M268 206 L268 216" />
          <path d="M306 205 L306 215" />
        </g>

        {/* Upper */}
        <path
          d="M58 188 V118 Q58 98 78 93 L97 88 Q109 86 119 96 L135 110 Q143 117 155 119 L207 128 Q241 134 269 152 L337 185 Q346 190 336 190 Z"
          fill={`url(#${uid}-body)`}
        />

        {/* Heel counter */}
        <path
          d="M58 188 V118 Q58 98 78 93 L106 87 Q97 120 101 150 Q103 172 112 188 Z"
          fill="#0A0A0A"
          opacity="0.55"
        />
        {/* Toe cap */}
        <path
          d="M269 152 L337 185 Q346 190 336 190 L252 190 Q254 166 269 152 Z"
          fill="#0A0A0A"
          opacity="0.38"
        />
        {/* Midfoot overlay */}
        <path
          d="M96 186 Q128 150 186 137 Q240 126 288 146 Q236 161 196 173 Q150 183 126 188 Z"
          fill="#0A0A0A"
          opacity="0.45"
        />

        {/* Collar padding */}
        <path
          d="M104 90 Q122 90 134 104 L124 112 Q114 102 100 100 Z"
          fill={p.from}
          opacity="0.85"
        />

        {/* Laces */}
        <g stroke={p.from} strokeWidth="4" strokeLinecap="round" opacity="0.95">
          <path d="M130 128 L174 141" />
          <path d="M157 143 L203 155" />
          <path d="M186 157 L232 168" />
        </g>

        {/* Topline highlight */}
        <path
          d="M120 97 L136 111 Q144 118 156 120 L207 129 Q241 135 268 153"
          stroke="#fff"
          strokeWidth="1.6"
          opacity="0.28"
          fill="none"
        />
        {/* Heel neon tab */}
        <rect x="56" y="150" width="7" height="26" rx="3.5" fill={p.from} opacity="0.9" />
      </svg>
    </div>
  );
}

export default SneakerVisual;
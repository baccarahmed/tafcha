"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Courbe d'easing de l'app (`--q2m-ease-out`) : plus franche que `ease-out`
 * natif, qui démarre trop doucement pour une entrée.
 */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface SpinShutterProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  /** Délai avant la révélation, en secondes. */
  delay?: number;
  /** Nombre de lames du diaphragme. */
  blades?: number;
}

/**
 * Révèle une image sous un diaphragme qui tourne puis s'efface.
 *
 * Motion minimal : uniquement `transform` (rotation) et `opacity` — jamais
 * `scale(0)`, jamais de propriété qui déclenche un layout. Sous
 * `prefers-reduced-motion`, le diaphragme est retiré et l'image apparaît en
 * fondu simple (l'opacité reste, le mouvement disparaît).
 */
export function SpinShutter({
  src,
  alt,
  className,
  sizes = "100vw",
  delay = 0,
  blades = 14,
}: SpinShutterProps) {
  const reduce = useReducedMotion();
  const isSvg = src.endsWith(".svg");

  const segment = 180 / blades;
  const shutter = `repeating-conic-gradient(from 0deg, #0b0b0b 0deg ${
    segment - 2
  }deg, #c9a45c ${segment - 2}deg ${segment}deg)`;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: "var(--q2m-bg-dark)", borderRadius: 4 }}
    >
      <motion.div
        className="absolute inset-0"
        initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: 5 }}
        whileInView={reduce ? { opacity: 1 } : { opacity: 1, rotate: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: reduce ? 0.25 : 0.7, ease: EASE_OUT, delay }}
      >
        <div className="relative h-full w-full transition-transform duration-300 ease-q2m group-hover:scale-[1.04]">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            unoptimized={isSvg}
            className="object-cover"
          />
        </div>
      </motion.div>

      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1/4"
          style={{ background: shutter }}
          initial={{ opacity: 1, rotate: -70 }}
          whileInView={{ opacity: 0, rotate: 30 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay }}
        />
      )}
    </div>
  );
}

export default SpinShutter;

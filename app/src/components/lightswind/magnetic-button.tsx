"use client";

import React, { useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  /** Button label or children */
  children: React.ReactNode;
  /** How strongly the button attracts (0–1, default 0.4) */
  strength?: number;
  /** Pixel radius in which magnetism activates */
  radius?: number;
  /** Visual variant */
  variant?: "primary" | "outline" | "ghost" | "dark" | "shimmer";
  /** Size */
  size?: "sm" | "md" | "lg";
  /** onClick handler */
  onClick?: (e?: React.MouseEvent) => void;
  /** Additional classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Style for the button */
  style?: React.CSSProperties;
  /** Style for the container div */
  containerStyle?: React.CSSProperties;
  /** Style for the inner span */
  innerStyle?: React.CSSProperties;
}

export function MagneticButton({
  children,
  strength = 0.4,
  radius = 80,
  variant = "primary",
  size = "md",
  onClick,
  className,
  disabled = false,
  style,
  containerStyle,
  innerStyle,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Spring config — snappy but elastic
  const springConfig = { stiffness: 200, damping: 18, mass: 0.6 };

  const rawX = useSpring(0, springConfig);
  const rawY = useSpring(0, springConfig);

  // Inner text moves slightly less than the container (parallax depth)
  const textX = useTransform(rawX, (v) => v * 0.4);
  const textY = useTransform(rawY, (v) => v * 0.4);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;
    const dist = Math.sqrt(distX ** 2 + distY ** 2);

    if (dist < radius) {
      rawX.set(distX * strength);
      rawY.set(distY * strength);
      setIsHovered(true);
    } else {
      rawX.set(0);
      rawY.set(0);
      setIsHovered(false);
    }
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
    setIsHovered(false);
  };

  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20",
    outline:
      "border-2 border-foreground text-foreground hover:bg-foreground/5",
    ghost:
      "text-foreground hover:bg-foreground/8",
    dark:
      "bg-foreground text-background shadow-lg",
    shimmer:
      "border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] animate-shimmer text-slate-400 hover:text-[#fff4e9]",
  };

  const sizes = {
    sm: "h-9 px-5 text-sm rounded-full",
    md: "h-12 px-8 text-base rounded-full",
    lg: "h-14 px-12 text-lg rounded-full",
  };

  return (
    <div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: "inline-flex", padding: radius * 0.25, ...containerStyle }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{ x: rawX, y: rawY, ...style }}
        animate={{ scale: isHovered ? 1.04 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "relative inline-flex items-center justify-center font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
      >
        {/* Subtle inner glow on hover */}
        <motion.span
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute inset-0 rounded-full bg-white/10"
        />

        {/* Text layer with slight parallax */}
        <motion.span
          style={{ x: textX, y: textY, ...innerStyle }}
          className="relative z-10 flex items-center gap-2"
        >
          {children}
        </motion.span>
      </motion.button>
    </div>
  );
}

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  // N'applique les variants `hover:`/`group-hover:` que sur les appareils à
  // pointeur précis. Sur mobile, un `hover` reste « collé » après un tap et
  // révèle un état fantôme (zoom d'image, bouton surligné, etc.).
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        condensed: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",

        "electric-yellow": {
          DEFAULT: "#C9A45C",
          50: "#FBF6EB",
          100: "#F4E9CB",
          200: "#E5CC8F",
          300: "#D9B673",
          400: "#D2A863",
          500: "#C9A45C",
          600: "#A68648",
          700: "#806636",
          900: "#3F331B",
        },
        "paris-cream": "#F3F2EE",
        "paris-dark": {
          900: "#000000",
          800: "#0B0B0B",
          700: "#111111",
          600: "#1A1A1A",
          500: "#1F1F1F",
          400: "#2A2A2A",
        },
        "q2m-gold": "#C9A45C",
        "auth-green": "#34D399",
        "neon-primary": "#C9A45C",
        "neon-accent": "#A68648",
        steel: {
          100: "#E5E7EB",
          300: "#9CA3AF",
          500: "#6B7280",
          700: "#374151",
          800: "#1F2937",
          900: "#111111",
        },
        sidebar: "hsl(var(--sidebar-background) / <alpha-value>)",
      },
      spacing: {
        1.75: "0.4375rem",
        4.5: "1.125rem",
        6.5: "1.625rem",
        7.5: "1.875rem",
        9.5: "2.375rem",
        10.5: "2.625rem",
        12.5: "3.125rem",
        13: "3.25rem",
        13.5: "3.375rem",
        15: "3.75rem",
        17: "4.25rem",
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      borderWidth: {
        1: "1px",
        3: "3px",
      },
      boxShadow: {
        "brutal-black": "4px 4px 0 0 #000",
        "brutal-yellow": "4px 4px 0 0 #FFE500",
        "brutal-sm": "2px 2px 0 0 #000",
        "glow-yellow":
          "0 0 20px rgba(255, 229, 0, 0.45), 0 0 40px rgba(255, 229, 0, 0.25), 0 0 60px rgba(255, 229, 0, 0.12)",
        "glass-card":
          "0 8px 32px 0 rgba(0, 0, 0, 0.36), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
      },
      letterSpacing: {
        tighterest: "-0.05em",
        ultra: "0.25em",
      },
      // Courbes d'easing custom, alignées sur les tokens CSS `--q2m-ease-*`.
      // Plus franches que `ease-out` natif : même durée, sensation plus vive.
      // Clés -> classes générées : `q2m` => `ease-q2m`, `q2m-in-out` => `ease-q2m-in-out`.
      transitionTimingFunction: {
        q2m: "cubic-bezier(0.23, 1, 0.32, 1)",
        "q2m-in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      transitionDuration: {
        140: "140ms",
        180: "180ms",
        240: "240ms",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-reverse": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0%)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scroll-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "skeleton-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
        "marquee-reverse": "marquee-reverse 34s linear infinite",
        "fade-in-up": "fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scroll-bounce": "scroll-bounce 2s ease-in-out infinite",
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up": "accordion-up 0.3s ease-out",
        "skeleton-shimmer": "skeleton-shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

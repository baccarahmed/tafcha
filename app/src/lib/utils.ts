import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Devise unique de la boutique : Q2M ne vend qu'en dinar tunisien. */
export const STORE_CURRENCY = 'TND'

/**
 * Les trois langues de la boutique vers leur region tunisienne.
 *
 * `-TN` n'est pas decoratif : sans lui, `ar` utilise les chiffres arabes
 * (١٢٣) alors que la Tunisie ecrit les nombres en chiffres latins. La
 * langue reste l'arabe, seule la graphie des chiffres suit l'usage local.
 */
const INTL_LOCALE: Record<string, string> = {
  fr: 'fr-TN',
  en: 'en-TN',
  ar: 'ar-TN',
}

/** Locale de rendu des montants pour la langue active. */
export function intlLocale(locale?: string): string {
  return INTL_LOCALE[locale ?? ''] ?? INTL_LOCALE.fr
}

/**
 * Montant formate en dinars.
 *
 * Le nombre de decimales suit l'usage tunisien — le dinar se cut en 1000
 * millimes, et un tarif de livraison ou de port ne s'ecrit jamais en 0,001 TND.
 * La valeur reste entiere tant que possible pour eviter « 249,000 TND » la ou
 * « 249 TND » suffirait.
 *
 * `locale` suit la langue active : un prix reste en dinars dans les trois
 * langues, mais ses separateurs de milliers et sa decimale changent.
 */
export function formatCurrency(amount: number, locale?: string): string {
  const rounded = Math.round(amount * 1000) / 1000

  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: STORE_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(rounded)
}

export function truncate(str: string, n: number): string {
  if (str.length <= n) return str
  return str.slice(0, n) + '...'
}

export function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Nombre de visuels acceptes sur une fiche produit. Au-dela, la galerie de la
 * page produit ne montre que les quatre premiers.
 */
export const MAX_PRODUCT_IMAGES = 6;

export function getSiteUrl() {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export function generateUniqueId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`
}

export function debounce<T extends (...args: never[]) => unknown>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function (...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

export function throttle<T extends (...args: never[]) => unknown>(func: T, limit: number) {
  let inThrottle = false
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSiteUrl() {
  // 1. Check for preloaded data from SSR/Global (prevents hydration mismatch)
  const globalSiteUrl = (globalThis as any).__SITE_URL__;
  if (globalSiteUrl) return globalSiteUrl.replace(/\/$/, '');

  // 2. Check if set in environment (build time)
  const envSiteUrl = import.meta.env.VITE_SITE_URL;
  if (envSiteUrl) return envSiteUrl.replace(/\/$/, '');

  // 3. Check for preloaded data from window (client-side fallback)
  if (typeof window !== 'undefined' && (window as any).__PRELOADED_DATA__?.baseUrl) {
    return (window as any).__PRELOADED_DATA__.baseUrl;
  }

  // 4. Fallback to current location on client
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }

  // 5. Default fallback
  return 'https://ethnicdeco.com';
}

// Utility function to format a number with currency
export function formatCurrency(amount: number, currency = "USD", options?: Intl.NumberFormatOptions) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        ...options,
    }).format(amount);
}

// Utility function to generate a unique ID
export function generateUniqueId(prefix = "id") {
    return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

// Utility function to truncate text
export function truncateText(text: string, maxLength: number) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength) + "...";
}

// Utility function to format date
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions) {
    return new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...options,
    }).format(date);
}

// Utility function to debounce function calls
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function (...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

// Utility function to throttle function calls
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number) {
    let inThrottle = false;
    return function (...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

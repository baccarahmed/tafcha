import 'server-only'

import { escapeHtml } from './telegram-api'

/**
 * Mise en forme des messages du bot.
 *
 * Centralise les conventions d'affichage (montants, dates, statuts, pointures)
 * pour que les commandes de lecture et les confirmations racontent la meme
 * chose : deux definitions de « vendu » ou de « expediee » finiraient par
 * diverger entre le dashboard et le bot.
 *
 * Tout ce qui vient de la base est echappe : les messages partent en
 * `parse_mode: HTML`, donc un `&` ou un `<` dans un nom de produit casserait le
 * message (voire le ferait refuser par Telegram).
 */

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: '🟠 En attente',
  PROCESSING: '🔵 En preparation',
  SHIPPED: '🚚 Expediee',
  DELIVERED: '✅ Livree',
  CANCELLED: '❌ Annulee',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: '⏳ En attente',
  PAID: '💰 Paye',
  FAILED: '⚠️ Echec',
  REFUNDED: '↩️ Rembourse',
}

export function statusBadge(status: string | null | undefined): string {
  return ORDER_STATUS_LABELS[status ?? ''] ?? `⚪️ ${escapeHtml(status ?? '—')}`
}

export function paymentBadge(status: string | null | undefined): string {
  return PAYMENT_STATUS_LABELS[status ?? ''] ?? `⚪️ ${escapeHtml(status ?? '—')}`
}

export function money(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount ?? 0

  return `${Number.isFinite(value) ? (value as number).toFixed(2) : '0.00'} DT`
}

/** Date a l'heure de Tunis (UTC+1 fixe : plus d'heure d'ete depuis 2008). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'

  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** Minuit heure de Tunis, exprime en UTC. */
export function tunisStartOfDay(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number)

  // Tunisie = UTC+1 toute l'annee : minuit local = 23 h UTC la veille.
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]) - 3600_000)
}

/**
 * Convertit une date `AAAA-MM-JJ` en instant ISO.
 *
 * La saisie est interpretee a l'heure de Tunis, jamais en UTC : une promotion
 * « du 1er au 5 » doit commencer quand la boutique ouvre, pas la veille a 1 h.
 */
export function parseTunisDate(value: string, endOfDay: boolean): string | null {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null

  const date = new Date(`${trimmed}T${endOfDay ? '23:59:59' : '00:00:00'}+01:00`)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Valide une date `AAAA-MM-JJ` et la renvoie telle quelle.
 *
 * Les fenetres de livraison sont stockees en date nue, pas en instant : la
 * vitrine affiche la valeur brute (elle n'a pas de fuseau a choisir), donc une
 * conversion en ISO y ferait apparaitre un décalage d'un jour.
 */
export function parseDateOnly(value: string): string | null {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null

  const date = new Date(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  // Rejette les jours inexistants (« 2026-02-31 »), que `Date` reporte au mois suivant.
  if (date.toISOString().slice(0, 10) !== trimmed) return null

  return trimmed
}

export function addressField(address: unknown, key: string): string | null {
  if (address && typeof address === 'object' && key in address) {
    const value = (address as Record<string, unknown>)[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

export function customerName(address: unknown): string {
  return addressField(address, 'fullName') ?? addressField(address, 'email') ?? '—'
}

export function addressLine(address: unknown): string {
  const parts = [
    addressField(address, 'line1'),
    addressField(address, 'city'),
    addressField(address, 'postalCode'),
    addressField(address, 'country'),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : '—'
}

export interface SizeStock {
  size: number
  stock: number
}

export function parseSizes(value: unknown): SizeStock[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const size = (entry as { size?: unknown }).size
    const stock = (entry as { stock?: unknown }).stock

    if (typeof size !== 'number' || typeof stock !== 'number') return []

    return [{ size, stock }]
  })
}

/** Detail compact des pointures : « 40:3 41:0 42:1 ». */
export function sizeLine(sizes: SizeStock[]): string {
  return sizes.length > 0 ? sizes.map((entry) => `${entry.size}:${entry.stock}`).join(' ') : '—'
}

/** Designation d'un produit : nom + coloris (les variantes sont des fiches a part). */
export function productLabel(product: { name: string | null; colorway?: string | null }): string {
  const colorway = product.colorway ? ` · ${escapeHtml(product.colorway)}` : ''

  return `${escapeHtml(product.name ?? '—')}${colorway}`
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`
}

export function flagBadge(active: boolean): string {
  return active ? '✅ actif' : '⛔️ inactif'
}

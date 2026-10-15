import 'server-only'

import { cache } from 'react'

import { insforgeAdmin } from './insforge-admin'

export interface ActivePromotion {
  id: string
  /** `PRODUCT` ou `CATEGORY` ; une valeur inconnue est traitee comme `PRODUCT`. */
  type: string
  /** `['*']` cible tout le catalogue, sinon des ids produits ou categories. */
  targets: string[]
  percentage: number
}

interface PromotionRow {
  id: string
  type: string | null
  targets: string[] | string | null
  percentage: number | string
}

/** `targets` est un tableau JSON ; on tolere une chaine pour rester robuste. */
function toTargets(value: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : ['*']
    } catch {
      return ['*']
    }
  }
  return ['*']
}

/**
 * Promotions actives a la date donnee : actives, commencées et non expirees.
 *
 * La date est filtree en base plutot que cote applicatif pour que la vitrine et
 * le checkout partagent la meme fenetre, y compris sur un serveur en UTC.
 */
async function loadActivePromotions(now: Date): Promise<ActivePromotion[]> {
  const iso = now.toISOString()

  const { data, error } = await insforgeAdmin()
    .database.from('promotions')
    .select('id, type, targets, percentage')
    .eq('active', true)
    .lte('start_date', iso)
    .gte('end_date', iso)
    .order('percentage', { ascending: false })

  if (error) throw new Error(`Failed to load promotions: ${error.message}`)

  return ((data ?? []) as unknown as PromotionRow[]).map((row) => ({
    id: row.id,
    type: row.type ?? 'PRODUCT',
    targets: toTargets(row.targets),
    percentage: Number(row.percentage) || 0,
  }))
}

/**
 * Horloge figee une fois par requete : sans cela, chaque `getActivePromotions()`
 * creerait un `new Date()` distinct, donc une cle de memoisation distincte, et
 * le catalogue rejouerait la requete promotions a chaque appel.
 */
const getActivePromotionsCached = cache(() => loadActivePromotions(new Date()))

/**
 * `now` reste expose pour les appelants qui doivent fixer la fenetre (tests,
 * outils) ; le chemin courant, sans argument, est memorise par requete.
 */
export function getActivePromotions(now?: Date): Promise<ActivePromotion[]> {
  return now ? loadActivePromotions(now) : getActivePromotionsCached()
}

export interface PromotionTargetable {
  id: string
  categoryId?: string | null
}

/**
 * Une promotion cible-t-elle ce produit ?
 *
 * Une promotion de type `CATEGORY` pointe vers `categories.id` ; il faut donc
 * comparer avec `categoryId` et jamais avec un slug, qui peut changer.
 */
function isTargeted(promotion: ActivePromotion, product: PromotionTargetable): boolean {
  if (promotion.targets.includes('*')) return true

  if (promotion.type === 'CATEGORY') {
    return Boolean(product.categoryId) && promotion.targets.includes(product.categoryId as string)
  }

  return promotion.targets.includes(product.id)
}

/**
 * Meilleur pourcentage applicable : si plusieurs promotions visent le meme
 * produit, la plus forte l'emporte (elles ne s'additionnent pas).
 */
export function resolveDiscountPercentage(
  product: PromotionTargetable,
  promotions: ActivePromotion[]
): number {
  let best = 0

  for (const promotion of promotions) {
    if (!isTargeted(promotion, product)) continue
    if (promotion.percentage > best) best = promotion.percentage
  }

  return best
}

/** Applique un pourcentage et arrondit au centime, comme les prix en base. */
export function applyPercentage(price: number, percentage: number): number {
  const clamped = Math.min(Math.max(percentage, 0), 90)
  if (clamped <= 0) return price

  return Math.round(price * (1 - clamped / 100) * 100) / 100
}

import 'server-only'

import { insforgeAdmin } from '@/lib/insforge-admin'

/**
 * Cycle de vie des promotions.
 *
 * Le schema impose `type IN ('CATEGORY','PRODUCT')`, un pourcentage dans ]0,100]
 * et `start_date`/`end_date` non nulles : la validation est donc refaite ici,
 * sinon une saisie erronee remonte une violation de CHECK illisible pour l'admin.
 */

const PROMO_TYPES = ['PRODUCT', 'CATEGORY'] as const

export type PromotionType = (typeof PROMO_TYPES)[number]

export class PromotionValidationError extends Error {
  constructor(public readonly field: string) {
    super(field)
    this.name = 'PromotionValidationError'
  }
}

export interface PromotionInput {
  name: string
  description: string | null
  type: PromotionType
  targets: string[]
  percentage: number
  startDate: string
  endDate: string
  active: boolean
  announcementText: string | null
}

function validate(input: PromotionInput): void {
  if (input.name.trim().length < 2) throw new PromotionValidationError('name')
  if (!(PROMO_TYPES as readonly string[]).includes(input.type))
    throw new PromotionValidationError('type')
  if (!Number.isFinite(input.percentage) || input.percentage <= 0 || input.percentage > 100)
    throw new PromotionValidationError('percentage')

  const start = Date.parse(input.startDate)
  const end = Date.parse(input.endDate)

  if (Number.isNaN(start) || Number.isNaN(end))
    throw new PromotionValidationError('dates')
  if (end <= start) throw new PromotionValidationError('dates')

  if (input.targets.length === 0) throw new PromotionValidationError('targets')
}

function toRow(input: PromotionInput): Record<string, unknown> {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    type: input.type,
    targets: input.targets,
    percentage: input.percentage,
    start_date: new Date(input.startDate).toISOString(),
    end_date: new Date(input.endDate).toISOString(),
    active: input.active,
    announcement_text: input.announcementText?.trim() || null,
  }
}

export async function createPromotion(input: PromotionInput): Promise<{ id: string }> {
  validate(input)

  const { data, error } = await insforgeAdmin()
    .database.from('promotions')
    .insert(toRow(input))
    .select('id')
    .single()

  if (error) throw new Error(`promotions: ${error.message}`)

  return data as unknown as { id: string }
}

export async function updatePromotion(
  id: string,
  input: PromotionInput
): Promise<{ id: string }> {
  validate(input)

  const { data, error } = await insforgeAdmin()
    .database.from('promotions')
    .update(toRow(input))
    .eq('id', id)
    .select('id')
    .single()

  if (error) throw new Error(`promotions: ${error.message}`)

  return data as unknown as { id: string }
}

/**
 * Bascule l'activation sans ressaisir le reste : c'est l'action la plus
 * frequente sur une promotion, et un formulaire complet pour un simple
 * interrupteur serait une source d'erreurs.
 */
export async function setPromotionActive(id: string, active: boolean): Promise<void> {
  const { error } = await insforgeAdmin()
    .database.from('promotions').update({ active }).eq('id', id)

  if (error) throw new Error(`promotions: ${error.message}`)
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await insforgeAdmin()
    .database.from('promotions')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`promotions: ${error.message}`)
}
'use server'

import { getSessionUser } from '@/lib/session'
import { insforgeAdmin } from '@/lib/insforge-admin'

export type ReviewErrorCode =
  | 'invalid'
  | 'auth'
  | 'notPurchased'
  | 'already'
  | 'failed'

export interface ReviewActionState {
  ok: boolean
  error?: ReviewErrorCode | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface CreateReviewInput {
  productId: string
  rating: number
  comment?: string
}

/**
 * Publie un avis « achat vérifié » sur un produit.
 *
 * La garde est double : l'utilisateur doit être connecté ET avoir une commande
 * payée contenant le produit (même règle que la policy RLS `reviews_insert_own`
 * qui exige `payment_status = 'PAID'`). On réécrit ce contrôle côté serveur
 * car l'insert passe par le client admin (non soumis à RLS).
 */
export async function createReviewAction(
  _prev: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'auth' }

  const productId = String(formData.get('productId') ?? '').trim()
  const rating = Number(formData.get('rating'))
  const comment = String(formData.get('comment') ?? '').trim().slice(0, 600)

  if (
    !UUID_RE.test(productId) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return { ok: false, error: 'invalid' }
  }

  const db = insforgeAdmin().database

  // Achat vérifié : commande payée du client contenant ce produit.
  const { data: paidOrders } = await db
    .from('orders')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_status', 'PAID')
    .limit(100)

  const paidOrderIds = (paidOrders ?? []).map((order) => (order as { id: string }).id)

  if (paidOrderIds.length === 0) return { ok: false, error: 'notPurchased' }

  const { data: purchased } = await db
    .from('order_items')
    .select('order_id')
    .eq('product_id', productId)
    .in('order_id', paidOrderIds)
    .limit(1)

  if (!purchased || purchased.length === 0) {
    return { ok: false, error: 'notPurchased' }
  }

  // Un seul avis par client et par produit.
  const { data: existing } = await db
    .from('reviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle<{ id: string }>()

  if (existing) return { ok: false, error: 'already' }

  const { error: insertError } = await db.from('reviews').insert([
    {
      user_id: user.id,
      product_id: productId,
      rating,
      comment: comment || null,
    },
  ])

  if (insertError) return { ok: false, error: 'failed' }

  return { ok: true, error: null }
}
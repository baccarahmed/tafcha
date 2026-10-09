import 'server-only'

import { insforgeAdmin } from './insforge-admin'

export interface ProductReview {
  id: string
  rating: number
  comment: string | null
  authorFirstName: string | null
  createdAt: string
}

interface ReviewRow {
  id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
}

/**
 * Avis publics d'un produit, du plus recent au plus ancien.
 *
 * Le nom d'affichage vient de `profiles` (first_name), jamais de l'email :
 * on demande le strict minimum au client. Le select passe par le client
 * admin (une jointure reviews->profiles n'existe pas en FK, on fetche en
 * deux temps, limite visible a l'ecran).
 */
export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  const db = insforgeAdmin().database

  const { data, error } = await db
    .from('reviews')
    .select('id, user_id, rating, comment, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data || data.length === 0) return []

  const rows = data as ReviewRow[]

  const userIds = Array.from(new Set(rows.map((row) => row.user_id)))

  const { data: profiles } = await db
    .from('profiles')
    .select('user_id, first_name')
    .in('user_id', userIds)

  const names = new Map(
    ((profiles ?? []) as Array<{ user_id: string; first_name: string | null }>).map(
      (profile) => [profile.user_id, profile.first_name ?? null]
    )
  )

  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    authorFirstName: names.get(row.user_id) ?? null,
    createdAt: row.created_at,
  }))
}

export interface ReviewStats {
  count: number
  score: number
}

export function reviewStats(reviews: ProductReview[]): ReviewStats {
  if (reviews.length === 0) return { count: 0, score: 0 }
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return { count: reviews.length, score: total / reviews.length }
}
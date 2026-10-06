import 'server-only'

import { insforgeAdmin } from '@/lib/insforge-admin'

/**
 * Pilotage des commandes depuis le back-office.
 *
 * Les valeurs possibles sont imposees par les CHECK du schema : les lister ici
 * permet aux actions de rejeter une valeur fantaisiste avant SQL, et sert de
 * source unique pour les listes deroulantes de l'interface.
 */

export const ORDER_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export class OrderValidationError extends Error {
  constructor(public readonly field: string) {
    super(field)
    this.name = 'OrderValidationError'
  }
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value)
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value)
}

export interface OrderItemSnapshot {
  id: string
  productId: string
  name: string | null
  slug: string | null
  colorway: string | null
  quantity: number
  price: number
  lineTotal: number
}

/**
 * Detail d'une commande, avec ses lignes.
 *
 * Les lignes sont resolues apres coup plutot que via une jointure PostgREST :
 * le SDK renvoie alors un objet imbrique dont la forme depend du deploiement,
 * alors qu'une liste de lignes garde un contrat stable pour le formulaire de
 * suivi comme pour l'impression.
 */
export async function getAdminOrderDetail(
  orderId: string
): Promise<{ items: OrderItemSnapshot[]; shippingAddress: unknown } | null> {
  const db = insforgeAdmin().database

  const { data: items, error: itemsError } = await db
    .from('order_items')
    .select('id,product_id,quantity,price')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (itemsError) throw new Error(`order_items: ${itemsError.message}`)

  const rows = (items ?? []) as Array<{
    id: string
    product_id: string
    quantity: number
    price: number | string | null
  }>

  if (rows.length === 0) return { items: [], shippingAddress: null }

  const { data: catalogue, error: catalogueError } = await db
    .from('products')
    .select('id,name,slug,colorway')
    .in(
      'id',
      [...new Set(rows.map((row) => row.product_id))]
    )

  if (catalogueError) throw new Error(`products: ${catalogueError.message}`)

  const products = new Map(
    ((catalogue ?? []) as Array<{
      id: string
      name: string | null
      slug: string | null
      colorway: string | null
    }>).map((product) => [product.id, product])
  )

  const { data: order, error: orderError } = await db
    .from('orders')
    .select('shipping_address')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError) throw new Error(`orders: ${orderError.message}`)

  return {
    shippingAddress: (order as { shipping_address: unknown } | null)?.shipping_address ?? null,
    items: rows.map((row) => {
      const price = typeof row.price === 'string' ? Number.parseFloat(row.price) : row.price ?? 0
      const product = products.get(row.product_id)

      return {
        id: row.id,
        productId: row.product_id,
        name: product?.name ?? '—',
        slug: product?.slug ?? null,
        colorway: product?.colorway ?? null,
        quantity: row.quantity ?? 0,
        price,
        lineTotal: price * (row.quantity ?? 0),
      }
    }),
  }
}

export interface OrderUpdate {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  notes?: string | null
  deliveryWindowStart?: string | null
  deliveryWindowEnd?: string | null
}

/**
 * Met a jour le suivi d'une commande.
 *
 * `updated_at` est rafraichi a chaque ecriture : sans cela, deux changements de
 * statuts successifs porteraient la meme date et l'historique de traitement
 * devient inexploitable.
 */
export async function updateOrder(orderId: string, patch: OrderUpdate): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (patch.status !== undefined) row.status = patch.status
  if (patch.paymentStatus !== undefined) row.payment_status = patch.paymentStatus
  if (patch.notes !== undefined) row.notes = patch.notes?.trim() || null
  if (patch.deliveryWindowStart !== undefined)
    row.delivery_window_start = patch.deliveryWindowStart?.trim() || null
  if (patch.deliveryWindowEnd !== undefined)
    row.delivery_window_end = patch.deliveryWindowEnd?.trim() || null

  const { error } = await insforgeAdmin()
    .database.from('orders')
    .update(row)
    .eq('id', orderId)

  if (error) throw new Error(`orders: ${error.message}`)
}
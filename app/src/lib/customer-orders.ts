import 'server-only'

import { insforgeAdmin } from './insforge-admin'

export interface CustomerOrderItem {
  id: string
  productId: string
  name: string
  colorway: string | null
  image: string | null
  slug: string | null
  size: string | null
  quantity: number
  price: number
}

export interface CustomerOrder {
  id: string
  shortId: string
  status: string
  paymentStatus: string
  paymentMethod: string | null
  subtotal: number
  shipping: number
  total: number
  createdAt: string
  deliveryWindowStart: string | null
  deliveryWindowEnd: string | null
  items: CustomerOrderItem[]
}

interface OrderRow {
  id: string
  status: string | null
  payment_status: string | null
  payment_method: string | null
  subtotal: number | string | null
  shipping: number | string | null
  total: number | string | null
  created_at: string
  delivery_window_start: string | null
  delivery_window_end: string | null
}

interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number | string | null
  size: string | null
}

const toNumber = (value: number | string | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value)

/**
 * Commandes rattachees a un compte, lignes comprises.
 *
 * Les commandes invitees (`user_id` null) en sont volontairement exclues :
 * le rattachement d'une commande a un compte est le seul lien fiable dont on
 * dispose, l'e-mail de livraison n'etant pas authentifie.
 */
export async function getMyOrders(userId: string): Promise<CustomerOrder[]> {
  if (!userId) return []

  const db = insforgeAdmin().database

  const { data, error } = await db
    .from('orders')
    .select(
      'id,status,payment_status,payment_method,subtotal,shipping,total,created_at,delivery_window_start,delivery_window_end',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`orders: ${error.message}`)

  const orders = (data ?? []) as OrderRow[]
  if (orders.length === 0) return []

  const itemsByOrder = await loadItems(orders.map((order) => order.id))

  return orders.map((order) => ({
    id: order.id,
    shortId: order.id.slice(0, 8).toUpperCase(),
    status: order.status ?? 'PENDING',
    paymentStatus: order.payment_status ?? 'PENDING',
    paymentMethod: order.payment_method,
    subtotal: toNumber(order.subtotal),
    shipping: toNumber(order.shipping),
    total: toNumber(order.total),
    createdAt: order.created_at,
    deliveryWindowStart: order.delivery_window_start,
    deliveryWindowEnd: order.delivery_window_end,
    items: itemsByOrder.get(order.id) ?? [],
  }))
}

/**
 * Lignes des commandes, nom/colorway/visuel resolus en une seule passe pour
 * toutes les commandes : une lecture par commande ferait autant d'allers-retours
 * que de commandes affichees.
 */
async function loadItems(orderIds: string[]): Promise<Map<string, CustomerOrderItem[]>> {
  const grouped = new Map<string, CustomerOrderItem[]>()
  if (orderIds.length === 0) return grouped

  const db = insforgeAdmin().database

  const { data, error } = await db
    .from('order_items')
    .select('id,order_id,product_id,quantity,price,size')
    .in('order_id', orderIds)

  if (error) throw new Error(`order_items: ${error.message}`)

  const rows = (data ?? []) as OrderItemRow[]
  if (rows.length === 0) return grouped

  const { data: catalogue, error: catalogueError } = await db
    .from('products')
    .select('id,name,colorway,slug,images')
    .in('id', [...new Set(rows.map((row) => row.product_id))])

  if (catalogueError) throw new Error(`products: ${catalogueError.message}`)

  const products = new Map(
    ((catalogue ?? []) as Array<{
      id: string
      name: string | null
      colorway: string | null
      slug: string | null
      images: string[] | null
    }>).map((product) => [product.id, product]),
  )

  for (const row of rows) {
    const product = products.get(row.product_id)
    const item: CustomerOrderItem = {
      id: row.id,
      productId: row.product_id,
      name: product?.name ?? 'Q2M',
      colorway: product?.colorway ?? null,
      image: product?.images?.[0] ?? null,
      slug: product?.slug ?? null,
      size: row.size,
      quantity: row.quantity,
      price: toNumber(row.price),
    }

    const bucket = grouped.get(row.order_id)
    if (bucket) bucket.push(item)
    else grouped.set(row.order_id, [item])
  }

  return grouped
}

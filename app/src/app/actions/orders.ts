'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@insforge/sdk/ssr'
import { getSessionUser } from '@/lib/session'

export interface CheckoutAddressInput {
  fullName: string
  email: string
  phone: string
  line1: string
  city: string
  postalCode: string
  country: string
  notes?: string
}

export interface CheckoutItemInput {
  productId: string
  quantity: number
  size?: string
}

export interface CreateOrderInput {
  address: CheckoutAddressInput
  items: CheckoutItemInput[]
}

export type CreateOrderErrorCode =
  | 'unauthenticated'
  | 'invalid'
  | 'empty'
  | 'unavailable'
  | 'outOfStock'
  | 'failed'

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: CreateOrderErrorCode }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Paiement a la livraison : la boutique n'integre pas encore de passerelle. */
const PAYMENT_METHOD = 'COD'

const round2 = (value: number) => Math.round(value * 100) / 100

function isAddressValid(address: CheckoutAddressInput): boolean {
  return (
    typeof address.fullName === 'string' &&
    address.fullName.trim().length >= 2 &&
    EMAIL_RE.test(String(address.email ?? '').trim()) &&
    String(address.phone ?? '').trim().length >= 8 &&
    String(address.line1 ?? '').trim().length >= 4 &&
    String(address.city ?? '').trim().length >= 2 &&
    String(address.postalCode ?? '').trim().length >= 2 &&
    String(address.country ?? '').trim().length >= 2
  )
}

/**
 * Cree une commande a partir du panier client.
 *
 * Les prix et les stocks sont relus en base : le montant facture ne vient
 * jamais du navigateur. Les totaux (sous-total, livraison, total) sont donc
 * recalcules ici avec les mêmes seuils que la vitrine.
 *
 * L'ecriture passe par le client lie a la session : la policy `orders_owner_access`
 * impose user_id = auth.uid(), ce que le client anon ne peut pas produire.
 * Le stock n'est pas decremente — la table `products` n'ecrit que pour les
 * admins — le controle se fait en lecture et le back-office gere la rupture.
 */
export async function createOrderAction(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const address = input?.address
  if (!address || !isAddressValid(address)) return { ok: false, error: 'invalid' }

  const items = Array.isArray(input?.items) ? input.items : []
  if (items.length === 0) return { ok: false, error: 'empty' }
  if (items.length > 50) return { ok: false, error: 'invalid' }

  const quantities = new Map<string, number>()

  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !UUID_RE.test(item.productId)) {
      return { ok: false, error: 'invalid' }
    }

    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return { ok: false, error: 'invalid' }
    }

    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + quantity)
  }

  const insforge = await createServerClient({ cookies: await cookies() })
  const db = insforge.database

  const { data: products, error: productsError } = await db
    .from('products')
    .select('id, price, stock, active')
    .in('id', Array.from(quantities.keys()))

  if (productsError) return { ok: false, error: 'failed' }

  const catalog = new Map(
    ((products ?? []) as Array<{
      id: string
      price: number | string
      stock: number
      active: boolean
    }>).map((row) => [row.id, row])
  )

  let subtotal = 0

  for (const [productId, quantity] of quantities) {
    const product = catalog.get(productId)
    if (!product || product.active === false) return { ok: false, error: 'unavailable' }
    if (Number(product.stock) < quantity) return { ok: false, error: 'outOfStock' }

    subtotal += Number(product.price) * quantity
  }

  const { data: settings } = await db
    .from('site_settings')
    .select('free_shipping_threshold_dnt, shipping_cost_dnt')
    .eq('id', 'main')
    .maybeSingle<{ free_shipping_threshold_dnt: number | string | null; shipping_cost_dnt: number | string | null }>()

  const freeShippingThreshold = Number(settings?.free_shipping_threshold_dnt) || 200
  const shippingCost = Number(settings?.shipping_cost_dnt) || 10
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingCost

  subtotal = round2(subtotal)
  const total = round2(subtotal + shipping)

  const { data: order, error: orderError } = await db
    .from('orders')
    .insert({
      user_id: user.id,
      status: 'PENDING',
      payment_status: 'PENDING',
      payment_method: PAYMENT_METHOD,
      subtotal,
      shipping,
      tax: 0,
      total,
      shipping_address: {
        fullName: address.fullName.trim(),
        email: String(address.email).trim(),
        phone: String(address.phone).trim(),
        line1: String(address.line1).trim(),
        city: String(address.city).trim(),
        postalCode: String(address.postalCode).trim(),
        country: String(address.country).trim(),
      },
      notes: String(address.notes ?? '').trim().slice(0, 500) || null,
    })
    .select('id')
    .single<{ id: string }>()

  if (orderError || !order) return { ok: false, error: 'failed' }

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    user_id: user.id,
    quantity: Number(item.quantity),
    price: Number(catalog.get(item.productId)?.price ?? 0),
    size: item.size ? String(item.size).slice(0, 16) : null,
  }))

  const { error: itemsError } = await db.from('order_items').insert(orderItems)

  if (itemsError) {
    // La commande sans ses lignes n'est pas exploitable : on la passe en
    // CANCELLED plutot que de laisser une coquille creuse au back-office
    // (le client lie a la session n'a pas le droit de DELETE sur `orders`).
    await db
      .from('orders')
      .update({ status: 'CANCELLED' })
      .eq('id', order.id)
      .eq('user_id', user.id)

    return { ok: false, error: 'failed' }
  }

  return { ok: true, orderId: order.id }
}

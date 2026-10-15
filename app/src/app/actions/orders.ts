'use server'

import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/session'
import { insforgeAdmin } from '@/lib/insforge-admin'
import {
  applyPercentage,
  getActivePromotions,
  resolveDiscountPercentage,
} from '@/lib/promotions'

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
  | 'invalid'
  | 'empty'
  | 'unavailable'
  | 'outOfStock'
  | 'rateLimited'
  | 'failed'

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: CreateOrderErrorCode }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Paiement a la livraison : la boutique n'integre pas encore de passerelle. */
const PAYMENT_METHOD = 'COD'

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Garde-fou anti-abus du checkout invité.
 *
 * Depuis qu'une commande est possible sans compte, l'action est ouverte aux
 * visiteurs anonymes : on limite le rythme par IP pour eviter le spam de
 * commandes factices. Best-effort et par instance (memoire du process), ce qui
 * suffit a un deploiement Node single-instance ; une passerelle (WAF, rate
 * limit upstream) reste la vraie protection en production.
 */
const RATE_LIMIT_MAX = 6
const RATE_LIMIT_WINDOW_MS = 60_000
const recentOrders = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const hits = (recentOrders.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)

  if (hits.length >= RATE_LIMIT_MAX) {
    recentOrders.set(key, hits)
    return true
  }

  hits.push(now)
  recentOrders.set(key, hits)

  if (recentOrders.size > 5000) {
    for (const [k, v] of recentOrders) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) recentOrders.delete(k)
    }
  }

  return false
}

async function requestKey(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || h.get('x-real-ip') || 'local'
}

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
 * Cree une commande a partir du panier client — avec ou sans compte.
 *
 * Les prix et les stocks sont relus en base : le montant facture ne vient
 * jamais du navigateur. Les totaux (sous-total, livraison, total) sont donc
 * recalcules ici avec les mêmes seuils que la vitrine.
 *
 * Ecriture : depuis la migration 20261008192851_close-order-insert-rls,
 * authenticated n'a plus INSERT sur orders/order_items. createOrderAction
 * ecrit donc systematiquement via le client admin (non soumis a RLS), avec
 * ou sans compte. user_id est conserve pour lier la commande a un compte
 * quand il y en a un ; l'e-mail du client est garde dans shipping_address
 * pour le back-office.
 *
 * Le stock (total et par taille) est valide puis decremente, via le client
 * admin : la table `products` n'est pas accessible en ecriture au client de
 * session. La decrementation est best-effort (bornee a zero) apres la
 * creation des lignes de commande.
 */
export async function createOrderAction(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const user = await getSessionUser()

  const address = input?.address
  if (!address || !isAddressValid(address)) return { ok: false, error: 'invalid' }

  const items = Array.isArray(input?.items) ? input.items : []
  if (items.length === 0) return { ok: false, error: 'empty' }
  if (items.length > 50) return { ok: false, error: 'invalid' }

  if (isRateLimited(await requestKey())) return { ok: false, error: 'rateLimited' }

  const quantities = new Map<string, number>()
  const sizeQuantities = new Map<string, number>()

  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !UUID_RE.test(item.productId)) {
      return { ok: false, error: 'invalid' }
    }

    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return { ok: false, error: 'invalid' }
    }

    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + quantity)

    if (item.size) {
      const sizeKey = String(item.size).trim()
      sizeQuantities.set(
        `${item.productId}|${sizeKey}`,
        (sizeQuantities.get(`${item.productId}|${sizeKey}`) ?? 0) + quantity
      )
    }
  }

  const db = insforgeAdmin().database

  const [productsResult, promotions] = await Promise.all([
    db
      .from('products')
      .select('id, price, category_id, stock, active, sizes')
      .in('id', Array.from(quantities.keys())),
    getActivePromotions(),
  ])

  const { data: products, error: productsError } = productsResult

  if (productsError) return { ok: false, error: 'failed' }

  interface ProductStockRow {
    id: string
    price: number | string
    category_id: string | null
    stock: number
    active: boolean
    sizes: Array<{ size: number | string; stock: number }> | null
  }

  const catalog = new Map(
    ((products ?? []) as ProductStockRow[]).map((row) => [row.id, row])
  )

  /**
   * Prix facture par produit, promotions actives appliquees.
   *
   * Le navigateur n'envoie aucun prix : c'est ici, avec les memes promotions
   * que la vitrine, que le montant est decide. Le panier n'affiche donc qu'une
   * estimation, et la commande enregistre toujours ce prix.
   */
  const unitPrices = new Map<string, number>()

  let subtotal = 0

  for (const [productId, quantity] of quantities) {
    const product = catalog.get(productId)
    if (!product || product.active === false) return { ok: false, error: 'unavailable' }
    if (Number(product.stock) < quantity) return { ok: false, error: 'outOfStock' }

    const unitPrice = applyPercentage(
      Number(product.price),
      resolveDiscountPercentage({ id: productId, categoryId: product.category_id }, promotions)
    )

    unitPrices.set(productId, unitPrice)
    subtotal += unitPrice * quantity
  }

  // Validation du stock par taille : si le produit declare des tailles et
  // que la commande porte sur une taille inconnue ou en rupture, on refuse.
  for (const [key, quantity] of sizeQuantities) {
    const sep = key.lastIndexOf('|')
    const productId = key.slice(0, sep)
    const sizeKey = key.slice(sep + 1)
    const product = catalog.get(productId)
    if (!product) continue
    const sizes = Array.isArray(product.sizes) ? product.sizes : []
    if (sizes.length === 0) continue
    const row = sizes.find((s) => String(s.size) === sizeKey)
    if (!row || Number(row.stock) < quantity) return { ok: false, error: 'outOfStock' }
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
      user_id: user?.id ?? null,
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
    user_id: user?.id ?? null,
    quantity: Number(item.quantity),
    price: unitPrices.get(item.productId) ?? 0,
    size: item.size ? String(item.size).slice(0, 16) : null,
  }))

  const { error: itemsError } = await db.from('order_items').insert(orderItems)

  if (itemsError) {
    // La commande sans ses lignes n'est pas exploitable : on la passe en
    // CANCELLED plutot que de laisser une coquille creuse au back-office.
    // Le nettoyage passe par le client admin (le client de session n'a plus
    // UPDATE sur `orders`, cf. 20261007090000_restrict-order-writes.sql) ; on
    // ne restreint par user_id que pour une commande rattachee a un compte.
    let cleanup = insforgeAdmin()
      .database.from('orders')
      .update({ status: 'CANCELLED' })
      .eq('id', order.id)

    if (user) cleanup = cleanup.eq('user_id', user.id)

    await cleanup

    return { ok: false, error: 'failed' }
  }

  // Decrementation best-effort des stocks apres validation. Le stock est
  // borne a zero (jamais negatif) ; les tailles sont mises a jour en meme
  // temps que le stock total. L'echec d'une mise a jour est logge mais ne
  // casse pas la commande deja creee.
  const decrements = new Map<string, { qty: number; sizes: Map<string, number> }>()

  for (const item of items) {
    const entry = decrements.get(item.productId) ?? { qty: 0, sizes: new Map<string, number>() }
    entry.qty += Number(item.quantity)
    if (item.size) {
      const sizeKey = String(item.size).trim()
      entry.sizes.set(sizeKey, (entry.sizes.get(sizeKey) ?? 0) + Number(item.quantity))
    }
    decrements.set(item.productId, entry)
  }

  for (const [productId, decrement] of decrements) {
    const product = catalog.get(productId)
    if (!product) continue

    const payload: Record<string, unknown> = {
      stock: Math.max(0, Number(product.stock) - decrement.qty),
    }

    if (Array.isArray(product.sizes) && product.sizes.length > 0 && decrement.sizes.size > 0) {
      payload.sizes = product.sizes.map((row) => {
        const sizeKey = String(row.size).trim()
        const qty = decrement.sizes.get(sizeKey)
        return qty ? { ...row, stock: Math.max(0, Number(row.stock) - qty) } : row
      })
    }

    const { error: decrementError } = await db
      .from('products')
      .update(payload)
      .eq('id', productId)

    if (decrementError) {
      console.error('stock decrement failed for', productId, decrementError.message)
    }
  }

  return { ok: true, orderId: order.id }
}

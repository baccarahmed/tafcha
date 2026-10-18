'use server'

import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/session'
import { insforgeAdmin } from '@/lib/insforge-admin'
import { notifyNewOrder, createTelegramOrderConfirmation } from '@/lib/notify-channels'
import { ipFromHeaders } from '@/lib/rate-limit'
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

/**
 * Cle de limitation : meme adresse « fiable » que les routes publiques
 * (`ipFromHeaders`) plutot que le PREMIER segment de `x-forwarded-for`, qui
 * est concatene par le client et donc rotatable pour contourner le plafond.
 */
async function requestKey(): Promise<string> {
  return ipFromHeaders(await headers())
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
 * Atomicite : la commande, ses lignes et le decrement des stocks sont ecrits
 * dans une seule fonction SQL (`create_order_with_stock`, migration
 * 20261015203041) appelee via `.rpc()`. Le stock (total et par taille) est
 * verrouille par `SELECT ... FOR UPDATE`, donc deux commandes concurrentes du
 * meme produit ne peuvent pas se survendre, et une rupture annule la commande.
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

  const db = insforgeAdmin().database

  /**
   * Seules les colonnes du prix sont lues ici : le stock n'est plus valide dans
   * cette requete. Il l'est dans la transaction SQL (`FOR UPDATE`), ou un
   * controle JavaScript laisserait la meme fenetre de survente.
   */
  const [productsResult, promotions] = await Promise.all([
    db
      .from('products')
      .select('id, price, category_id, active')
      .in('id', Array.from(quantities.keys())),
    getActivePromotions(),
  ])

  const { data: products, error: productsError } = productsResult

  if (productsError) return { ok: false, error: 'failed' }

  interface ProductPriceRow {
    id: string
    price: number | string
    category_id: string | null
    active: boolean
  }

  const catalog = new Map(
    ((products ?? []) as ProductPriceRow[]).map((row) => [row.id, row])
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

    const unitPrice = applyPercentage(
      Number(product.price),
      resolveDiscountPercentage({ id: productId, categoryId: product.category_id }, promotions)
    )

    unitPrices.set(productId, unitPrice)
    subtotal += unitPrice * quantity
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

  /**
   * Ecriture atomique : `create_order_with_stock` insere la commande, ses
   * lignes et decremente les stocks dans une seule transaction (verrou
   * `SELECT ... FOR UPDATE`). Soit tout est engage, soit rien : plus de
   * commande sans stock engage ni de read-modify-write qui survend.
   *
   * Les prix et totaux restent calcules ici (promotions incluses) : la
   * fonction persiste les montants, elle ne les recalcule pas.
   */
  const { data: orderId, error: orderError } = await db.rpc('create_order_with_stock', {
    p_user_id: user?.id ?? null,
    p_payment_method: PAYMENT_METHOD,
    p_subtotal: subtotal,
    p_shipping: shipping,
    p_tax: 0,
    p_total: total,
    p_shipping_address: {
      fullName: address.fullName.trim(),
      email: String(address.email).trim(),
      phone: String(address.phone).trim(),
      line1: String(address.line1).trim(),
      city: String(address.city).trim(),
      postalCode: String(address.postalCode).trim(),
      country: String(address.country).trim(),
    },
    p_notes: String(address.notes ?? '').trim().slice(0, 500) || null,
    p_items: items.map((item) => ({
      product_id: item.productId,
      quantity: Number(item.quantity),
      price: unitPrices.get(item.productId) ?? 0,
      size: item.size ? String(item.size).slice(0, 16) : null,
    })),
  })

  if (orderError) {
    // La fonction signale la cause par un message (`RAISE EXCEPTION`), que
    // PostgREST renvoie tel quel : on le retraduit en code d'erreur typé.
    const message = orderError.message ?? ''

    if (/outOfStock/.test(message)) return { ok: false, error: 'outOfStock' }
    if (/unavailable/.test(message)) return { ok: false, error: 'unavailable' }
    if (/empty/.test(message)) return { ok: false, error: 'empty' }
    if (/invalid/.test(message)) return { ok: false, error: 'invalid' }

    console.error('create order failed :', message)

    return { ok: false, error: 'failed' }
  }

  // Canaux externes (Telegram/e-mail admin) : best-effort et desactives par
  // defaut, une panne de canal ne doit jamais faire echouer la commande.
  void notifyNewOrder({
    orderId: orderId as string,
    customerName: String(address.fullName).trim(),
    total,
    itemCount: items.reduce((sum, item) => sum + Number(item.quantity), 0),
  }).catch(() => {})

  // Confirmation Telegram : persiste la confirmation et publie le formulaire
  // avec boutons Confirmer/Annuler. Best-effort : une panne ne doit jamais
  // faire échouer la commande.
  void createTelegramOrderConfirmation({
    orderId: orderId as string,
  }).catch(() => {})

  return { ok: true, orderId: orderId as string }
}

import 'server-only'

import { insforgeAdmin } from './insforge-admin'
import { addressField, addressLine, customerName } from './telegram-format'
import { shortOrderId } from './notifications-types'
import type { OrderLookup } from './telegram-lookup'

/**
 * Confirmations de commandes en attente Telegram.
 *
 * Flux : nouvelle commande → entrée créée → notification Telegram →
 * admin confirme/annule → coordonnées client envoyées si confirmé.
 */

export interface OrderConfirmationRow {
  id: string
  order_id: string
  chat_id: number
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_address: string | null
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  created_at: string
  resolved_at: string | null
}

/**
 * Crée une entrée de confirmation pour une nouvelle commande.
 * Appelé par `createOrderAction` après la création réussie.
 */
export async function createOrderConfirmation(params: {
  orderId: string
  chatId: number
  order: OrderLookup
}): Promise<OrderConfirmationRow> {
  const { orderId, chatId, order } = params

  const name = customerName(order.shippingAddress)
  const phone = addressField(order.shippingAddress, 'phone')
  const email = addressField(order.shippingAddress, 'email')
  const address = addressLine(order.shippingAddress)

  const { data, error } = await insforgeAdmin()
    .database.from('telegram_order_confirmations')
    .insert({
      order_id: orderId,
      chat_id: chatId,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      customer_address: address,
      status: 'PENDING',
    })
    .select()
    .single()

  if (error) {
    console.error('telegram_order_confirmations insert:', error.message)
    throw new Error(`Échec création confirmation: ${error.message}`)
  }

  return data as unknown as OrderConfirmationRow
}

/**
 * Confirme une commande et retourne les coordonnées client.
 */
export async function confirmOrder(orderId: string): Promise<{
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
}> {
  const db = insforgeAdmin().database

  const { data: confirmation, error: readError } = await db
    .from('telegram_order_confirmations')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'PENDING')
    .maybeSingle()

  if (readError) throw new Error(`Lecture confirmation: ${readError.message}`)
  if (!confirmation) throw new Error('Confirmation introuvable ou déjà traitée')

  // Mettre à jour le statut
  const { error: updateError } = await db
    .from('telegram_order_confirmations')
    .update({
      status: 'CONFIRMED',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', confirmation.id)

  if (updateError) {
    console.error('telegram_order_confirmations update:', updateError.message)
  }

  return {
    customerName: confirmation.customer_name ?? '—',
    customerPhone: confirmation.customer_phone ?? '—',
    customerEmail: confirmation.customer_email ?? '—',
    customerAddress: confirmation.customer_address ?? '—',
  }
}

/**
 * Annule une commande confirmée.
 */
export async function cancelOrder(orderId: string): Promise<void> {
  const { error } = await insforgeAdmin()
    .database.from('telegram_order_confirmations')
    .update({
      status: 'CANCELLED',
      resolved_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .eq('status', 'PENDING')

  if (error) throw new Error(`Annulation commande: ${error.message}`)
}

/**
 * Vérifie si une commande a une confirmation en attente.
 */
export async function hasPendingConfirmation(orderId: string): Promise<boolean> {
  const { data, error } = await insforgeAdmin()
    .database.from('telegram_order_confirmations')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'PENDING')
    .maybeSingle()

  if (error) {
    console.error('hasPendingConfirmation:', error.message)
    return false
  }

  return data !== null
}

/**
 * Liste les confirmations de commande en attente d'un chat.
 * Utilisée par `/pending` pour relancer l'envoi du formulaire.
 */
export async function listPendingConfirmations(
  chatId: number
): Promise<OrderConfirmationRow[]> {
  const { data, error } = await insforgeAdmin()
    .database.from('telegram_order_confirmations')
    .select('*')
    .eq('chat_id', chatId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw new Error(`Liste confirmations: ${error.message}`)

  return (data ?? []) as unknown as OrderConfirmationRow[]
}

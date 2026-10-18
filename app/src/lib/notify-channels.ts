import 'server-only'

import { insforgeAdmin } from './insforge-admin'
import { shortOrderId } from './notifications-types'

/**
 * Canaux de notification externes (Telegram / e-mail admin).
 *
 * Volontairement DÉSACTIVÉS pour l'instant : rien n'est envoye tant que
 * `NOTIFY_CHANNELS_ENABLED` n'est pas a `'true'`. Le code est pret pour
 * l'activation ulterieure (Telegram : BotFather token + chat_id ; e-mail :
 * `emails.send` InsForge). WhatsApp (Meta Cloud API, templates pre-approuves,
 * opt-in, fenetre 24 h) reste en phase 2.
 *
 * Tous les appels sont « best-effort » : une panne de canal externe ne doit
 * jamais faire echouer la creation/mise a jour d'une commande cote client.
 */

const TIMEOUT_MS = 5000

function isEnabled(): boolean {
  return process.env.NOTIFY_CHANNELS_ENABLED === 'true'
}

function adminEmail(): string | null {
  return process.env.ADMIN_NOTIFICATION_EMAIL ?? null
}

function fromEmail(): string {
  return process.env.INSFORGE_FROM_EMAIL ?? 'Q2M <no-reply@que2marque.com>'
}

function formatPrice(amount: number): string {
  return `${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'} DT`
}

/** Envoi d'un message Telegram au chat admin configure. No-op si non configure. */
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return false

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      signal: controller.signal,
    })
    return response.ok
  } catch (error) {
    console.error('sendTelegram:', error)
    return false
  } finally {
    clearTimeout(timer)
  }
}

/** E-mail vers l'adresse admin configuree. No-op si non configure. */
export async function sendOrderEmail(subject: string, html: string): Promise<boolean> {
  const to = adminEmail()
  if (!to) return false

  try {
    const { error } = await insforgeAdmin().emails.send({
      to,
      from: fromEmail(),
      subject,
      html,
    })
    if (error) {
      console.error('sendOrderEmail:', error.message)
      return false
    }
    return true
  } catch (error) {
    console.error('sendOrderEmail:', error)
    return false
  }
}

export interface NotifyNewOrderInput {
  orderId: string
  customerName: string
  total: number
  itemCount: number
}

/** Alerte « nouvelle commande » (admin). Best-effort, silencieux si desactive. */
export async function notifyNewOrder(input: NotifyNewOrderInput): Promise<void> {
  if (!isEnabled()) return

  const reference = shortOrderId(input.orderId)
  const summary = `Commande #${reference} — ${input.customerName} — ${input.itemCount} article(s) — ${formatPrice(input.total)}`

  await Promise.allSettled([
    sendTelegram(`🛒 ${summary}`),
    sendOrderEmail(
      `Nouvelle commande #${reference}`,
      `<p>${summary}</p>`
    ),
  ])
}

export interface NotifyOrderStatusInput {
  orderId: string
  status: string
}

/** Alerte « changement de statut » (admin). Best-effort, silencieux si desactive. */
export async function notifyOrderStatusChange(input: NotifyOrderStatusInput): Promise<void> {
  if (!isEnabled()) return

  const reference = shortOrderId(input.orderId)
  const summary = `Commande #${reference} — statut : ${input.status}`

  await Promise.allSettled([
    sendTelegram(`🔔 ${summary}`),
    sendOrderEmail(`Commande #${reference} mise à jour`, `<p>${summary}</p>`),
  ])
}

export interface TelegramOrderConfirmationInput {
  orderId: string
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
  total: number
}

/**
 * Crée une confirmation Telegram pour une nouvelle commande et notifie l'admin.
 * La confirmation est persistée dans `telegram_order_confirmations`.
 */
export async function createTelegramOrderConfirmation(
  input: TelegramOrderConfirmationInput
): Promise<void> {
  if (!isEnabled()) return

  const { createOrderConfirmation } = await import('./telegram-orders')

  // Trouver le chat_id admin
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) return

  // Construire un OrderLookup minimal pour la confirmation
  const { findOrder } = await import('./telegram-lookup')
  const order = await findOrder(input.orderId)
  if (!order) return

  await createOrderConfirmation({
    orderId: input.orderId,
    chatId: Number(chatId),
    order,
  })

  // Envoyer la notification Telegram avec boutons de confirmation
  const reference = shortOrderId(input.orderId)
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) return

  const summary = [
    `🛒 <b>Nouvelle commande #${reference}</b>`,
    '',
    `Client : ${input.customerName}`,
    `Téléphone : ${input.customerPhone}`,
    `Total : ${formatPrice(input.total)}`,
  ].join('\n')

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: summary,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Confirmer', callback_data: `run:order:${input.orderId}` },
            { text: '❌ Annuler', callback_data: `run:cancel:${input.orderId}` },
          ]],
        },
      }),
    })
  } catch (error) {
    console.error('createTelegramOrderConfirmation:', error)
  }
}

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

import 'server-only'

/**
 * Client bas niveau de la Bot API Telegram.
 *
 * Cette couche ne connait ni commandes ni metier : elle expose juste les
 * appels HTTP dont le routeur a besoin, avec un timeout et un retour `null`
 * plutot qu'une exception — une panne Telegram ne doit jamais faire repondre
 * autre chose que 200 au webhook (sinon Telegram rejoue l'update en boucle).
 */

const API_BASE = 'https://api.telegram.org'
const REQUEST_TIMEOUT_MS = 8000

/** Limite dure de Telegram : un message fait au plus 4096 caracteres. */
const MESSAGE_LIMIT = 4000

export interface InlineKeyboardButton {
  text: string
  callback_data?: string
  url?: string
}

export interface ReplyMarkup {
  inline_keyboard: InlineKeyboardButton[][]
}

export interface TelegramChat {
  id: number
}

export interface TelegramMessage {
  message_id: number
  chat: TelegramChat
  from?: { id: number }
  text?: string
}

export interface TelegramCallbackQuery {
  id: string
  from: { id: number }
  data?: string
  message?: TelegramMessage
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

interface TelegramApiResponse<T> {
  ok: boolean
  result?: T
  description?: string
}

function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null
}

/**
 * Chats autorises a piloter le bot.
 *
 * `TELEGRAM_ALLOWED_CHAT_IDS` (liste separee par des virgules) permet
 * d'ouvrir le bot a plusieurs administrateurs ; sinon on retombe sur le
 * `TELEGRAM_CHAT_ID` des notifications sortantes.
 */
export function allowedChatIds(): string[] {
  const raw = process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? process.env.TELEGRAM_CHAT_ID ?? ''

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

export function isAllowedChat(chatId: number | string | null | undefined): boolean {
  if (chatId === null || chatId === undefined) return false

  return allowedChatIds().includes(String(chatId))
}

/** Echappe le texte dynamique pour un envoi en `parse_mode: HTML`. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Coupe un texte trop long en morceaux <= 4096 caracteres, sur les sauts de ligne. */
function splitMessage(text: string): string[] {
  if (text.length <= MESSAGE_LIMIT) return [text]

  const chunks: string[] = []
  let current = ''

  for (const line of text.split('\n')) {
    if (current && current.length + line.length + 1 > MESSAGE_LIMIT) {
      chunks.push(current)
      current = line
    } else {
      current = current ? `${current}\n${line}` : line
    }
  }

  if (current) chunks.push(current)

  return chunks
}

async function callApi<T>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  const token = botToken()
  if (!token) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const body = (await response.json().catch(() => null)) as TelegramApiResponse<T> | null

    if (!response.ok || !body?.ok) {
      console.error(`telegram ${method}:`, body?.description ?? response.status)
      return null
    }

    return body.result ?? null
  } catch (error) {
    console.error(`telegram ${method}:`, error)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Envoie un message HTML, decoupe automatiquement s'il est trop long. */
export async function sendMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: ReplyMarkup,
): Promise<void> {
  const chunks = splitMessage(text)

  for (let index = 0; index < chunks.length; index += 1) {
    const isLast = index === chunks.length - 1

    await callApi('sendMessage', {
      chat_id: chatId,
      text: chunks[index],
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(isLast && replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  }
}

/** Remplace le contenu d'un message. Sans `replyMarkup`, le clavier inline disparait. */
export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  replyMarkup?: ReplyMarkup,
): Promise<void> {
  await callApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  })
}

/** Stoppe le « sablier » d'un bouton inline. */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await callApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  })
}

/** Affiche « en train d'ecrire… » pendant une requete un peu longue. */
export async function sendChatAction(
  chatId: number | string,
  action: 'typing' | 'upload_document' = 'typing',
): Promise<void> {
  await callApi('sendChatAction', { chat_id: chatId, action })
}

export interface TelegramCommand {
  command: string
  description: string
}

/** (Re)declare l'URL du webhook. `secretToken` est renvoye dans un header. */
export async function setWebhook(url: string, secretToken: string): Promise<boolean> {
  const result = await callApi<boolean>('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  })

  return result === true
}

/** Menu de commandes affiche par le bouton « / » de Telegram. */
export async function setMyCommands(commands: TelegramCommand[]): Promise<boolean> {
  const result = await callApi<boolean>('setMyCommands', { commands })

  return result === true
}

export interface WebhookInfo {
  url?: string
  pending_update_count?: number
  last_error_message?: string
}

export async function getWebhookInfo(): Promise<WebhookInfo | null> {
  return callApi<WebhookInfo>('getWebhookInfo', {})
}

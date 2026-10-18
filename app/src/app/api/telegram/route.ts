import type { NextRequest } from 'next/server'

import { handleTelegramUpdate } from '@/lib/telegram-bot'
import type { TelegramUpdate } from '@/lib/telegram-api'

/**
 * Webhook du bot Telegram (phases 1 & 2).
 *
 * Deux gardes avant tout traitement :
 *  1. `TELEGRAM_WEBHOOK_SECRET` doit etre configure — sans secret, l'endpoint
 *     refuse de repondre plutot que d'accepter des updates non authentifies.
 *  2. le header `X-Telegram-Bot-Api-Secret-Token` doit correspondre au secret
 *     transmis a `setWebhook`.
 *
 * Telegram rejoue un update tant qu'il ne recoit pas de 2xx : on repond donc
 * 200 meme si le traitement echoue (l'erreur est journalisee), pour ne pas
 * provoquer de boucle de retry.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// L'analyse IA d'une photo (upload + Gemini) peut dépasser la limite par
// défaut : sans ce plafond, Vercel coupe avant que Telegram ne reçoive la
// réponse.
export const maxDuration = 60

export async function POST(request: NextRequest): Promise<Response> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET

  if (!secret) {
    console.error('telegram webhook: TELEGRAM_WEBHOOK_SECRET manquant')
    return new Response('not configured', { status: 503 })
  }

  if (request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('forbidden', { status: 403 })
  }

  let update: TelegramUpdate

  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return new Response('bad request', { status: 400 })
  }

  try {
    await handleTelegramUpdate(update)
  } catch (error) {
    console.error('telegram webhook:', error)
  }

  return Response.json({ ok: true })
}

/** Sonde de disponibilite : ne revele aucun secret et ne touche pas la base. */
export function GET(): Response {
  return Response.json({ ok: true })
}

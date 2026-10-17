'use client'

import { createBrowserClient } from '@insforge/sdk/ssr'

type BrowserClient = ReturnType<typeof createBrowserClient>

let client: BrowserClient | null = null

/**
 * Client navigateur authentifie (lit les cookies de session), utilise pour le
 * temps reel : le socket doit porter le JWT de l'utilisateur pour que les
 * policies RLS de `realtime.channels` autorisent l'abonnement a son canal
 * personnel. Le client anon (`insforge.ts`) ne porte pas la session.
 *
 * Singleton : une seule connexion Socket.IO par onglet.
 */
export function getBrowserInsforge(): BrowserClient {
  if (client) return client

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

  if (!baseUrl || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_INSFORGE_URL / NEXT_PUBLIC_INSFORGE_ANON_KEY. Check .env.local.'
    )
  }

  client = createBrowserClient({ baseUrl, anonKey })
  return client
}

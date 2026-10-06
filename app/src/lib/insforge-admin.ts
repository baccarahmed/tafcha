import 'server-only'

import { createAdminClient } from '@insforge/sdk'

/**
 * Admin client — server-only, bypasses RLS.
 * Never import this from a client component and never expose INSFORGE_API_KEY
 * to the browser.
 */
export function insforgeAdmin() {
  const baseUrl = process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL
  const apiKey = process.env.INSFORGE_API_KEY

  if (!baseUrl || !apiKey) {
    throw new Error('Missing INSFORGE_URL / INSFORGE_API_KEY. Check .env.local.')
  }

  return createAdminClient({ baseUrl, apiKey })
}
import { createClient } from '@insforge/sdk'

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

if (!baseUrl || !anonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_INSFORGE_URL / NEXT_PUBLIC_INSFORGE_ANON_KEY. Check .env.local.'
  )
}

/** Anon client — safe for browser and SSR. Row access is decided by RLS. */
export const insforge = createClient({ baseUrl, anonKey })

export const INSFORGE_BASE_URL = baseUrl
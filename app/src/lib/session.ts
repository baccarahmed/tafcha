import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@insforge/sdk/ssr'

export interface SessionUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: 'CUSTOMER' | 'ADMIN'
}

/**
 * Resolves the signed-in visitor from the InsForge session cookie.
 * The profile row decides the role, so a tampered client token cannot promote anyone.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const insforge = await createServerClient({ cookies: await cookies() })

  const { data, error } = await insforge.auth.getCurrentUser()
  const user = data?.user
  if (error || !user) return null

  const { data: profile } = await insforge.database
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('user_id', user.id)
    .maybeSingle<{ first_name: string | null; last_name: string | null; role: 'CUSTOMER' | 'ADMIN' }>()

  return {
    id: user.id,
    email: user.email,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    role: profile?.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
  }
}
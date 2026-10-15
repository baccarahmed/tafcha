import 'server-only'

import { cache } from 'react'
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
 *
 * `cache()` dedupe l'appel au sein d'une meme requete : le layout et la page qui
 * lisent tous deux la session ne declenchent qu'un seul aller-retour reseau
 * (`auth.getCurrentUser` + `profiles`) au lieu de deux.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
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
})
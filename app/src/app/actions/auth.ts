'use server'

import { cookies } from 'next/headers'
import { redirect } from '@/i18n/navigation'
import { createAuthActions } from '@insforge/sdk/ssr'
import { routing, type Locale } from '@/i18n/routing'

/**
 * Machine-readable failure reasons. The action stays locale-agnostic and the
 * client maps each code onto its own dictionary entry, so a server action
 * never has to carry translated copy.
 */
export type AuthErrorCode = 'missing' | 'invalid'

export interface AuthActionState {
  error: AuthErrorCode | null
}

/**
 * Server actions are locale-agnostic, so the active locale is passed through
 * the form and validated here before being used to build the redirect URL.
 */
function readLocale(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? '')
  return (routing.locales as readonly string[]).includes(raw)
    ? (raw as Locale)
    : routing.defaultLocale
}

/**
 * Establishes the InsForge session (httpOnly refresh cookie) and routes the
 * visitor to /dashboard when their profile carries the ADMIN role.
 */
export async function signIn(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'missing' }
  }

  const auth = createAuthActions({ cookies: await cookies() })
  const { error } = await auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'invalid' }
  }

  // Destination demandée avant la connexion (ex. /checkout) : seule une route
  // interne est rejouée, une URL absolue ou protocole-externe est ignorée.
  const rawNext = String(formData.get('next') ?? '')
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null

  redirect({ href: next ?? '/dashboard', locale: readLocale(formData) })
}

export async function signOut(formData: FormData): Promise<void> {
  const auth = createAuthActions({ cookies: await cookies() })
  await auth.signOut()
  redirect({ href: '/', locale: readLocale(formData) })
}
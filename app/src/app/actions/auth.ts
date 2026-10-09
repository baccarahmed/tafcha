'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from '@/i18n/navigation'
import { createAuthActions } from '@insforge/sdk/ssr'
import { rateLimit } from '@/lib/rate-limit'
import { routing, type Locale } from '@/i18n/routing'
import { safeReturnPath } from '@/lib/safe-redirect'

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
 * Cliente IP « fiable » pour le throttle : x-real-ip quand le frontal le
 * renseigne, sinon le dernier segment de x-forwarded-for (ajoute par le proxy
 * de confiance) ; a defaut une cle commune 'unknown' qui limite collectivement.
 */
async function requestIp(): Promise<string> {
  const h = await headers()
  const real = h.get('x-real-ip')?.trim()
  if (real) return real

  const forwarded = h.get('x-forwarded-for')
  const segments = forwarded
    ?.split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
  const last = segments?.[segments.length - 1]
  return last ?? 'unknown'
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

  // Throttle anti brute-force (pentest F-SIGNUP-1) : 5 essais/min/email et
  // 20 essais/min/IP. La reponse reste generique ('invalid') pour ne pas
  // reveler ni la politique de debit ni la validite d'un email.
  const ip = await requestIp()
  const emailKeyLimit = rateLimit(`signin:${email.toLowerCase().trim()}`, 5, 60_000)
  const ipKeyLimit = rateLimit(`signin:ip:${ip}`, 20, 60_000)

  if (!emailKeyLimit.ok || !ipKeyLimit.ok) {
    return { error: 'invalid' }
  }

  const auth = createAuthActions({ cookies: await cookies() })
  const { error } = await auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'invalid' }
  }

  // Destination demandee avant la connexion (ex. /checkout) : seule une route
  // interne est rejouee, une URL absolue ou une destination reinterpretee
  // comme externe (/evil.com, //evil.com, /\evil.com) est ignoree.
  const next = safeReturnPath(String(formData.get('next') ?? ''))

  redirect({ href: next ?? '/dashboard', locale: readLocale(formData) })
}

export async function signOut(formData: FormData): Promise<void> {
  const auth = createAuthActions({ cookies: await cookies() })
  await auth.signOut()
  redirect({ href: '/', locale: readLocale(formData) })
}
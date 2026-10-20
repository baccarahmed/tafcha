'use server'

import { headers } from 'next/headers'
import { redirect } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { insforgeAdmin } from '@/lib/insforge-admin'
import { generateTotpSecret, totpUri, verifyTotp } from '@/lib/totp'
import {
  clearAllMfaSessions,
  clearMfaSession,
  getMfaStatus,
  issueMfaSession,
} from '@/lib/mfa'
import { getSessionAdmin } from '@/lib/admin-guard'
import { ipFromHeaders, rateLimit } from '@/lib/rate-limit'
import { safeReturnPath } from '@/lib/safe-redirect'

/**
 * Actions du MFA admin (VULN-001). Toutes sont serveur-only : le secret TOTP
 * ne quitte jamais la base, et chaque tentative est throttlee par IP via le
 * compteur partage (VULN-002), au-dela de 5 essais/min → reponse generique.
 */

export type MfaErrorCode = 'forbidden' | 'invalid' | 'rateLimited' | 'noSecret' | null

export interface MfaActionState {
  error: MfaErrorCode
  ok?: boolean
}

export interface MfaSetupState {
  ok: boolean
  error?: MfaErrorCode
  secret?: string
  uri?: string
}

async function throttled(bucket: string, maxPerMinute: number): Promise<boolean> {
  const ip = ipFromHeaders(await headers())
  const limit = await rateLimit(`mfa:${bucket}:${ip}`, maxPerMinute, 60_000)
  return limit.ok
}

/** Locale transmise par le formulaire (les actions sont agnostiques). */
function readLocale(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? '')
  return (routing.locales as readonly string[]).includes(raw)
    ? (raw as Locale)
    : routing.defaultLocale
}

async function readSecret(userId: string): Promise<string | null> {
  const { data, error } = await insforgeAdmin().database
    .from('admin_mfa')
    .select('secret')
    .eq('user_id', userId)
    .maybeSingle<{ secret: string }>()
  if (error) throw new Error(`mfa secret: ${error.message}`)
  return data?.secret ?? null
}

/**
 * Etape 1 de l'activation : genere et stocke une nouvelle cle (non active).
 * `enabled=false` tant que le code n'a pas ete confirme : ainsi, une rotation
 * de cle en cours ne verrouille jamais l'admin (et exige deja une preuve TOTP
 * valide si le MFA etait actif — impossible a déclencher avec un mot de passe
 * seul).
 */
export async function startMfaSetup(): Promise<MfaSetupState> {
  const admin = await getSessionAdmin()
  if (!admin) return { ok: false, error: 'forbidden' }

  const status = await getMfaStatus(admin.user.id)
  if (status.enabled && !admin.mfaSatisfied) return { ok: false, error: 'forbidden' }
  if (!(await throttled('setup', 10))) return { ok: false, error: 'rateLimited' }

  const secret = generateTotpSecret()
  const { error } = await insforgeAdmin().database.from('admin_mfa').upsert([
    {
      user_id: admin.user.id,
      secret,
      enabled: false,
      confirmed_at: null,
      updated_at: new Date().toISOString(),
    },
  ])
  if (error) {
    console.error('mfa setup:', error.message)
    return { ok: false, error: 'invalid' }
  }

  return {
    ok: true,
    secret,
    uri: totpUri({ secret, account: admin.user.email, issuer: 'Q2M' }),
  }
}

/**
 * Etape 2 : verification du code saisi, activation, puis emission de la
 * preuve TOTP pour ce navigateur (l'admin atterrit directement en session
 * prouvee).
 */
export async function confirmMfaSetup(
  _prev: MfaActionState,
  formData: FormData
): Promise<MfaActionState> {
  const admin = await getSessionAdmin()
  if (!admin) return { error: 'forbidden' }
  if (!(await throttled('confirm', 5))) return { error: 'rateLimited' }

  const secret = await readSecret(admin.user.id)
  if (!secret) return { error: 'noSecret' }

  const code = String(formData.get('code') ?? '').trim()
  if (!verifyTotp(secret, code)) return { error: 'invalid' }

  const { error } = await insforgeAdmin().database
    .from('admin_mfa')
    .update({ enabled: true, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', admin.user.id)
  if (error) {
    console.error('mfa confirm:', error.message)
    return { error: 'invalid' }
  }

  await issueMfaSession(admin.user.id)
  return { error: null, ok: true }
}

/**
 * Challenge de connexion (/mfa) : reussite du code → preuve TOTP →
 * redirection vers la destination interne demandee. L'echec retourne un
 * etat d'erreur (jamais de redirection) pour que le formulaire l'affiche.
 */
export async function verifyMfaLogin(
  _prev: MfaActionState,
  formData: FormData
): Promise<MfaActionState> {
  const admin = await getSessionAdmin()
  const next = safeReturnPath(String(formData.get('next') ?? '')) ?? '/dashboard'

  if (!admin) return { error: 'forbidden' }

  // Deja prouve (double soumission, onglet conserve) : aucune verification
  // supplementaire, on rejoint simplement le dashboard.
  if (admin.mfaSatisfied) {
    redirect({ href: next, locale: readLocale(formData) })
  }

  if (!(await throttled('verify', 5))) return { error: 'rateLimited' }

  const secret = await readSecret(admin.user.id)
  if (!secret) return { error: 'invalid' }

  const code = String(formData.get('code') ?? '').trim()
  if (!verifyTotp(secret, code)) return { error: 'invalid' }

  await issueMfaSession(admin.user.id)
  redirect({ href: next, locale: readLocale(formData) })
}

/**
 * Desactivation : exige un code TOTP valide — meme avec une session prouvee,
 * desactiver le second facteur doit rester impossible pour un vol de session
 * « navigateur ouvert ».
 */
export async function disableMfa(
  _prev: MfaActionState,
  formData: FormData
): Promise<MfaActionState> {
  const admin = await getSessionAdmin()
  if (!admin || !admin.mfaSatisfied) return { error: 'forbidden' }
  if (!(await throttled('disable', 5))) return { error: 'rateLimited' }

  const secret = await readSecret(admin.user.id)
  if (!secret) return { error: 'noSecret' }

  const code = String(formData.get('code') ?? '').trim()
  if (!verifyTotp(secret, code)) return { error: 'invalid' }

  const { error } = await insforgeAdmin().database
    .from('admin_mfa')
    .delete()
    .eq('user_id', admin.user.id)
  if (error) {
    console.error('mfa disable:', error.message)
    return { error: 'invalid' }
  }

  await clearAllMfaSessions(admin.user.id)
  await clearMfaSession()
  return { error: null, ok: true }
}

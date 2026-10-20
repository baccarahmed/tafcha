import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { insforgeAdmin } from '@/lib/insforge-admin'

/**
 * Sessions MFA « preuve TOTP » (VULN-001).
 *
 * Mode d'emploi : la session InsForge (mot de passe) ne suffit pas pour un
 * admin inscrit au MFA. Apres reussite du code TOTP, on pose le cookie
 * httpOnly `q2m_mfa` contenant un jeton aleatoire ; on ne persiste que son
 * hash SHA-256 dans `admin_mfa_sessions`. `hasMfaSession` est le point de
 * verifie exigé par `requireAdmin` (actions serveur) et le layout du
 * dashboard (pages).
 *
 * Le secret TOTP lui-meme (`admin_mfa.secret`) n'est jamais lu ici : seules
 * les actions de verification/setup y accedent via le client admin. Un jeton
 * InsForge volé (mot de passe seul) ne permet donc ni de lire la cle, ni de
 * franchir `hasMfaSession`.
 */

export const MFA_COOKIE = 'q2m_mfa'

/** Duree d'une preuve TOTP : 12 h (une journee de travail), puis re-demoi. */
export const MFA_SESSION_TTL_MS = 12 * 60 * 60 * 1000

export interface MfaStatus {
  /** Une cle existe (confirmee ou en cours d'activation). */
  enrolled: boolean
  /** Le MFA est actif : toute session admin exige une preuve TOTP. */
  enabled: boolean
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Statut MFA d'un utilisateur. Lecture via le client admin : la table est
 * REVOKEe a anon/authenticated, aucun jeton utilisateur n'y a acces.
 * Deduplique par requete (React `cache`), donc layout + actions ne font
 * qu'un aller-retour.
 */
export const getMfaStatus = cache(async (userId: string): Promise<MfaStatus> => {
  const { data, error } = await insforgeAdmin().database
    .from('admin_mfa')
    .select('enabled')
    .eq('user_id', userId)
    .maybeSingle<{ enabled: boolean }>()

  if (error) throw new Error(`mfa status: ${error.message}`)
  return { enrolled: !!data, enabled: data?.enabled === true }
})

/**
 * Vrai si l'utilisateur n'a pas de MFA actif OU si ce navigateur détient une
 * preuve TOTP valide (cookie signe par hash en base, non expiree).
 */
export const hasMfaSession = cache(async (userId: string): Promise<boolean> => {
  const status = await getMfaStatus(userId)
  if (!status.enabled) return true

  const token = (await cookies()).get(MFA_COOKIE)?.value
  if (!token || token.length < 32 || token.length > 128) return false

  const { data, error } = await insforgeAdmin().database
    .from('admin_mfa_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('token_hash', sha256(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle<{ id: string }>()

  if (error) throw new Error(`mfa session: ${error.message}`)
  return !!data
})

/**
 * Emet la preuve TOTP pour ce navigateur (apres verification du code) :
 * insertion du hash + cookie httpOnly. Purge au passage les sessions
 * expirees de l'utilisateur (entretien opportuniste).
 */
export async function issueMfaSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + MFA_SESSION_TTL_MS)

  const { error } = await insforgeAdmin().database.from('admin_mfa_sessions').insert([
    {
      user_id: userId,
      token_hash: sha256(token),
      expires_at: expiresAt.toISOString(),
    },
  ])
  if (error) throw new Error(`mfa session: ${error.message}`)

  await insforgeAdmin().database
    .from('admin_mfa_sessions')
    .delete()
    .eq('user_id', userId)
    .lt('expires_at', new Date().toISOString())

  const jar = await cookies()
  jar.set(MFA_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

/** Retire la preuve de CE navigateur (deconnexion, desactivation MFA). */
export async function clearMfaSession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(MFA_COOKIE)?.value

  if (token) {
    const { error } = await insforgeAdmin().database
      .from('admin_mfa_sessions')
      .delete()
      .eq('token_hash', sha256(token))
    if (error) console.error('mfa clear:', error.message)
    jar.delete(MFA_COOKIE)
  }
}

/**
 * Purge TOUTES les sessions TOTP d'un utilisateur. Utilise quand le MFA est
 * desactive : aucune preuve anterieure ne doit survivre a la re-activation.
 */
export async function clearAllMfaSessions(userId: string): Promise<void> {
  const { error } = await insforgeAdmin().database
    .from('admin_mfa_sessions')
    .delete()
    .eq('user_id', userId)
  if (error) console.error('mfa clear all:', error.message)
}

import 'server-only'

import { cache } from 'react'
import { getSessionUser, type SessionUser } from '@/lib/session'
import { hasMfaSession } from '@/lib/mfa'

/**
 * Garde admin centree (VULN-001).
 *
 * Avant, chaque action repetait `if (!user || user.role !== 'ADMIN')` : le
 * controle etait dispersé sur ~18 sites et ne pouvait pas integrer le MFA
 * sans toucher partout. Ici, une seule exigence :
 *
 *   - session InsForge valide ;
 *   - role ADMIN relu en base (profil, pas le jeton) ;
 *   - et, si ce compte est inscrit au MFA, une preuve TOTP valide pour ce
 *     navigateur (`hasMfaSession`).
 *
 * `requireAdmin` retourne l'utilisateur uniquement quand les trois sont
 * reunis, sinon null — les appelsants gardent leur forme de reponse
 * historique (`forbidden`, redirection, etc.).
 */
export interface AdminSession {
  user: SessionUser
  /** false = session valide mais TOTP absent/expire : il faut re-passer /mfa. */
  mfaSatisfied: boolean
}

export const getSessionAdmin = cache(async (): Promise<AdminSession | null> => {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') return null
  return { user, mfaSatisfied: await hasMfaSession(user.id) }
})

/** Admin authentifie ET prouve par TOTP (quand le MFA est actif). */
export const requireAdmin = cache(async (): Promise<SessionUser | null> => {
  const admin = await getSessionAdmin()
  return admin && admin.mfaSatisfied ? admin.user : null
})

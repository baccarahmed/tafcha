import 'server-only'

import { insforgeAdmin } from '@/lib/insforge-admin'

/**
 * Gestion des comptes depuis le back-office.
 *
 * La table `auth.users` n'est pas modifiable ici : le SDK d'administration n'a
 * pas de route de suppression de compte, et un profil sans compte correspondant
 * serait un orphelin invisible cote back-office. On se limite donc au role, ce
 * qui est la seule donnee de `profiles` propre a l'exploitation.
 */

export class UserValidationError extends Error {
  constructor(public readonly field: string) {
    super(field)
    this.name = 'UserValidationError'
  }
}

export async function setUserRole(
  userId: string,
  role: 'CUSTOMER' | 'ADMIN'
): Promise<void> {
  const { error } = await insforgeAdmin()
    .database.from('profiles')
    .update({ role })
    .eq('user_id', userId)

  if (error) throw new Error(`profiles: ${error.message}`)
}

/**
 * Retire les privileges administrateur.
 *
 * Renvoie `lastAdmin` si l'admin cible est le dernier compte `ADMIN` de la
 * plateforme : sans ce garde-fou, une erreur de clic verrouillerait l'ensemble
 * du back-office, personne ne pouvant plus reattribuer le role.
 */
export async function demoteUser(
  userId: string
): Promise<{ ok: true } | { ok: false; reason: 'lastAdmin' }> {
  const { data, error } = await insforgeAdmin()
    .database.from('profiles')
    .select('user_id,role')
    .eq('role', 'ADMIN')

  if (error) throw new Error(`profiles: ${error.message}`)

  const admins = (data ?? []) as Array<{ user_id: string }>

  if (admins.length <= 1 && admins[0]?.user_id === userId) {
    return { ok: false, reason: 'lastAdmin' }
  }

  await setUserRole(userId, 'CUSTOMER')

  return { ok: true }
}
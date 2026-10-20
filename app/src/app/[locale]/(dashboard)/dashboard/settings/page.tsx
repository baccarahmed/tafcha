import { getSiteSettings } from '@/lib/admin-settings'
import { getSessionUser } from '@/lib/session'
import { getMfaStatus } from '@/lib/mfa'
import SettingsForm from './settings-form'
import MfaPanel from './mfa-panel'

export const dynamic = 'force-dynamic'

export default async function DashboardSettingsPage() {
  const [settings, user] = await Promise.all([getSiteSettings(), getSessionUser()])
  // getSessionUser est deduplique avec le layout de la requete : aucun
  // appel reseau supplémentaire. Non-admin inatteignable (layout).
  const mfa = user ? await getMfaStatus(user.id) : { enrolled: false, enabled: false }

  return (
    <div>
      <SettingsForm settings={settings} />
      {/* key : remontage a chaque bascule reelle du 2FA — remet les etats
          d'action (useActionState) a zero, ce qui rend la derivation
          `active` du panneau correcte meme apres plusieurs allers-retours. */}
      <MfaPanel
        key={mfa.enabled ? 'mfa-on' : 'mfa-off'}
        accountEmail={user?.email ?? ''}
        initialEnabled={mfa.enabled}
      />
    </div>
  )
}

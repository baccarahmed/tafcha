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
      <MfaPanel accountEmail={user?.email ?? ''} initialEnabled={mfa.enabled} />
    </div>
  )
}

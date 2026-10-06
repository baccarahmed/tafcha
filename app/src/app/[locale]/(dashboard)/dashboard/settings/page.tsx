import { getSiteSettings } from '@/lib/admin-settings'
import SettingsForm from './settings-form'

export const dynamic = 'force-dynamic'

export default async function DashboardSettingsPage() {
  const settings = await getSiteSettings()
  return <SettingsForm settings={settings} />
}

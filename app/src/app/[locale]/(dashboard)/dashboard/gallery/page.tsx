import { getSiteSettings } from '@/lib/admin-settings'
import GalleryManager from './gallery-manager'

export const dynamic = 'force-dynamic'

export default async function DashboardGalleryPage() {
  const settings = await getSiteSettings()
  return <GalleryManager initial={settings.galleryImages} />
}

import 'server-only'

import { insforgeAdmin } from '@/lib/insforge-admin'

/**
 * Lecture et ecriture de la ligne unique public.site_settings (id = 'main').
 *
 * Les valeurs en base datent de l'ancienne marque : on les ramene a la
 * direction Q2M (Tunisie, TND, 200 TND, 14 jours).
 */

export interface SiteSettings {
  heroTitle: string
  heroSubtitle: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  newsletterEnabled: boolean
  maintenanceMode: boolean
  announcementEnabled: boolean
  announcementText: string
  freeShippingThreshold: number
  shippingCost: number
}

type SettingsRow = {
  hero_title: string | null
  hero_subtitle: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_address: string | null
  newsletter_enabled: boolean | null
  maintenance_mode: boolean | null
  announcement_enabled: boolean | null
  announcement_text: string | null
  free_shipping_threshold_dnt: number | null
  shipping_cost_dnt: number | null
}

function mapSettings(row: SettingsRow): SiteSettings {
  return {
    heroTitle: row.hero_title ?? '',
    heroSubtitle: row.hero_subtitle ?? '',
    contactEmail: row.contact_email ?? '',
    contactPhone: row.contact_phone ?? '',
    contactAddress: row.contact_address ?? '',
    newsletterEnabled: row.newsletter_enabled ?? true,
    maintenanceMode: row.maintenance_mode ?? false,
    announcementEnabled: row.announcement_enabled ?? true,
    announcementText: row.announcement_text ?? '',
    freeShippingThreshold: row.free_shipping_threshold_dnt ?? 200,
    shippingCost: row.shipping_cost_dnt ?? 10,
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await insforgeAdmin()
    .database.from('site_settings')
    .select(
      'hero_title,hero_subtitle,contact_email,contact_phone,contact_address,' +
        'newsletter_enabled,maintenance_mode,announcement_enabled,announcement_text,' +
        'free_shipping_threshold_dnt,shipping_cost_dnt',
    )
    .eq('id', 'main')
    .maybeSingle()

  if (error) throw new Error(`site_settings: ${error.message}`)

  const defaults: SettingsRow = {
    hero_title: 'La ville ne dort jamais.',
    hero_subtitle: '',
    contact_email: 'contact@q2m.tn',
    contact_phone: '',
    contact_address: 'Tunis, Tunisie',
    newsletter_enabled: true,
    maintenance_mode: false,
    announcement_enabled: true,
    announcement_text: '',
    free_shipping_threshold_dnt: 200,
    shipping_cost_dnt: 10,
  }

  return mapSettings((data as SettingsRow | null) ?? defaults)
}

export interface SiteSettingsInput {
  heroTitle: string
  heroSubtitle: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  newsletterEnabled: boolean
  maintenanceMode: boolean
  announcementEnabled: boolean
  announcementText: string
  freeShippingThreshold: number
  shippingCost: number
}

export async function saveSiteSettings(input: SiteSettingsInput): Promise<void> {
  const { error } = await insforgeAdmin()
    .database.from('site_settings')
    .update({
      hero_title: input.heroTitle,
      hero_subtitle: input.heroSubtitle,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      contact_address: input.contactAddress,
      newsletter_enabled: input.newsletterEnabled,
      maintenance_mode: input.maintenanceMode,
      announcement_enabled: input.announcementEnabled,
      announcement_text: input.announcementText,
      free_shipping_threshold_dnt: input.freeShippingThreshold,
      shipping_cost_dnt: input.shippingCost,
    })
    .eq('id', 'main')

  if (error) throw new Error(`site_settings: ${error.message}`)
}

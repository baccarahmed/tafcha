import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'

import { insforgeAdmin } from '@/lib/insforge-admin'
import { CATALOG_TAGS } from '@/lib/cache-tags'

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
  /** URLs de la galerie orbitale (section « Authenticité garantie »). */
  galleryImages: string[]
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
  gallery_images: unknown
}

/**
 * `gallery_images` arrive en jsonb : on ne fait confiance qu'a un tableau de
 * chaines non vides, tout le reste retombe sur un tableau vide.
 */
function mapGalleryImages(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  )
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
    galleryImages: mapGalleryImages(row.gallery_images),
  }
}

async function loadSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await insforgeAdmin()
    .database.from('site_settings')
    .select(
      'hero_title,hero_subtitle,contact_email,contact_phone,contact_address,' +
        'newsletter_enabled,maintenance_mode,announcement_enabled,announcement_text,' +
        'free_shipping_threshold_dnt,shipping_cost_dnt,gallery_images',
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
    gallery_images: [],
  }

  return mapSettings((data as SettingsRow | null) ?? defaults)
}

/**
 * Reglages vitrine (forme camelCase). Meme cache que `catalog.getSiteSettings` :
 * les ecritures back-office purgent l'etiquette `settings`.
 */
export const getSiteSettings = cache(
  unstable_cache(loadSiteSettings, ['admin-site-settings'], {
    tags: [CATALOG_TAGS.settings],
    revalidate: 300,
  })
)

/**
 * Meme lecture, sans memoisation.
 *
 * `cache()` depend d'un rendu React en cours : un Route Handler (le webhook
 * Telegram) n'en a pas toujours un. On relit donc la ligne directement, avec
 * les memes valeurs de repli, pour que le bot puisse construire un
 * enregistrement complet a partir de l'etat courant.
 */
export async function getSiteSettingsInput(): Promise<SiteSettingsInput> {
  const settings = await loadSiteSettings()

  return {
    heroTitle: settings.heroTitle,
    heroSubtitle: settings.heroSubtitle,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    contactAddress: settings.contactAddress,
    newsletterEnabled: settings.newsletterEnabled,
    maintenanceMode: settings.maintenanceMode,
    announcementEnabled: settings.announcementEnabled,
    announcementText: settings.announcementText,
    freeShippingThreshold: settings.freeShippingThreshold,
    shippingCost: settings.shippingCost,
  }
}

/** Champs editables depuis le back-office, en camelCase. */
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

/**
 * Remplace uniquement les visuels de la galerie. Le formulaire de reglages
 * ecrit ailleurs : les deux editions ne se marchent pas dessus.
 */
export async function saveGalleryImages(images: string[]): Promise<void> {
  const clean = images.filter((url) => typeof url === 'string' && url.trim().length > 0)

  const { error } = await insforgeAdmin()
    .database.from('site_settings')
    .update({ gallery_images: clean })
    .eq('id', 'main')

  if (error) throw new Error(`site_settings: ${error.message}`)
}

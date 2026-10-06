import type { SneakerProduct } from './product'

export interface DbCategory {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  position: number
}

/** Product row enriched with the category it belongs to. */
export type CatalogProduct = SneakerProduct & {
  sku?: string | null
  categorySlug?: string
  categoryId?: string | null
  dropEndsAt?: string
}

export interface SiteSettings {
  id: string
  hero_title: string | null
  hero_subtitle: string | null
  site_bg_color: string | null
  site_panel_color: string | null
  announcement_text: string[] | null
  announcement_bg_color: string | null
  announcement_text_color: string | null
  announcement_enabled: boolean
  contact_email: string | null
  contact_phone: string | null
  contact_address: string | null
  social_instagram: string | null
  newsletter_enabled: boolean
  free_shipping_threshold_dnt: number | string | null
  shipping_cost_dnt: number | string | null
}
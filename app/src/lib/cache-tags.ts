import 'server-only'

/**
 * Etiquettes du Data Cache pour les lectures catalogue.
 *
 * Elles servent de contrat entre les lecteurs (`unstable_cache` dans
 * `lib/catalog.ts`, `lib/promotions.ts`, `lib/admin-settings.ts`) et les
 * ecritures back-office, qui purgent par `revalidateTag` (cf.
 * `lib/revalidate-catalog.ts`). Ce module ne doit dependre d'aucun runtime
 * Next : il est importe aussi bien par des modules serveur que par les tests.
 */
export const CATALOG_TAGS = {
  products: 'catalog:products',
  promotions: 'catalog:promotions',
  settings: 'catalog:settings',
} as const

/** Toutes les etiquettes : une ecriture back-office peut concerner les trois. */
export const CATALOG_TAG_LIST = [
  CATALOG_TAGS.products,
  CATALOG_TAGS.promotions,
  CATALOG_TAGS.settings,
] as const

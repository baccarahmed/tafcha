export type SneakerPalette = 'crimson' | 'ember' | 'void' | 'volt' | 'onyx';

/**
 * Un coloris d'un modele. Le modele regroupe plusieurs fiches produit (une par
 * coloris) ; chaque variante est une fiche complete avec son propre stock.
 */
export interface ProductVariant {
  id: string;
  slug: string;
  colorway: string;
  palette: SneakerPalette;
  /** Photo de couverture du coloris, pour la pastille du selecteur. */
  image?: string;
  price: number;
  isSoldOut: boolean;
}

export interface SneakerProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  comparePrice?: number;
  /** Drives the procedural SneakerVisual fallback when images is empty. */
  palette: SneakerPalette;
  /** Alternate angle rendered on hover. */
  hoverPalette?: SneakerPalette;
  colorway: string;
  /** Product photos from InsForge. Empty means fall back to the procedural visual. */
  images: string[];
  sizes: { size: number | string; stock: number }[];
  featured?: boolean;
  category?: 'retro' | 'performance' | 'lifestyle' | 'collab';
  /** Stored on the row; `unisexe` is a real value, not a fallback for NULL. */
  gender?: ProductGender | null;
  releaseDate?: string;
  isNewDrop?: boolean;
  isSoldOut?: boolean;
  /** Modele parent ; null pour la fiche de reference, renseigne pour un coloris. */
  parentId?: string | null;
  /** Tous les coloris du modele, fiche courante comprise. */
  variants?: ProductVariant[];
}

export type ProductGender = 'homme' | 'femme' | 'enfant' | 'unisexe';

export type SneakerPalette = 'crimson' | 'ember' | 'void' | 'volt' | 'onyx';

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
}

export type ProductGender = 'homme' | 'femme' | 'enfant' | 'unisexe';
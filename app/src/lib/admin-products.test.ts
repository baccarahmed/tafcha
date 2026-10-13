import { describe, expect, it } from 'vitest'
import {
  GENDER_OPTIONS,
  PALETTE_OPTIONS,
  ProductValidationError,
  validateProduct,
  type ProductInput,
} from '@/lib/admin-products'

/** Fiche valide minimale ; chaque test ne fait varier qu'un champ. */
function baseInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: 'Air Jordan 1',
    slug: 'air-jordan-1',
    sku: 'Q2M-BONE-014',
    brand: 'Q2M',
    description: 'Une silhouette iconique.',
    colorway: 'Bone',
    images: ['https://cdn.test/one.jpg'],
    price: 249,
    comparePrice: null,
    categoryId: null,
    gender: 'unisexe',
    palette: 'onyx',
    sizes: [{ size: 42, stock: 3 }],
    featured: false,
    active: true,
    isNewDrop: false,
    parentId: null,
    ...overrides,
  }
}

function fieldOf(input: ProductInput): string | null {
  try {
    validateProduct(input)
    return null
  } catch (error) {
    if (error instanceof ProductValidationError) return error.field
    throw error
  }
}

describe('validateProduct', () => {
  it('accepte une fiche complete', () => {
    expect(() => validateProduct(baseInput())).not.toThrow()
  })

  it('refuse un nom trop court', () => {
    expect(fieldOf(baseInput({ name: 'a' }))).toBe('name')
  })

  it('refuse un prix non positif ou non fini', () => {
    expect(fieldOf(baseInput({ price: 0 }))).toBe('price')
    expect(fieldOf(baseInput({ price: -5 }))).toBe('price')
    expect(fieldOf(baseInput({ price: Number.NaN }))).toBe('price')
  })

  it('refuse un prix barre inferieur ou egal au prix', () => {
    expect(fieldOf(baseInput({ price: 200, comparePrice: 200 }))).toBe('comparePrice')
    expect(fieldOf(baseInput({ price: 200, comparePrice: 150 }))).toBe('comparePrice')
  })

  it('accepte un prix barre superieur', () => {
    expect(() => validateProduct(baseInput({ price: 200, comparePrice: 250 }))).not.toThrow()
  })

  it('refuse une image non http(s)', () => {
    expect(fieldOf(baseInput({ images: ['/uploads/a.jpg'] }))).toBe('images')
  })

  it('refuse plus de six visuels', () => {
    const images = Array.from({ length: 7 }, (_, i) => `https://cdn.test/${i}.jpg`)
    expect(fieldOf(baseInput({ images }))).toBe('images')
  })

  it('refuse une palette inconnue', () => {
    expect(fieldOf(baseInput({ palette: 'rose' as never }))).toBe('palette')
  })

  it('refuse un genre inconnu', () => {
    expect(fieldOf(baseInput({ gender: 'autre' as never }))).toBe('gender')
  })

  it('refuse une liste de pointures vide', () => {
    expect(fieldOf(baseInput({ sizes: [] }))).toBe('sizes')
  })

  it('refuse une pointure non entiere ou negative', () => {
    expect(fieldOf(baseInput({ sizes: [{ size: 42.5, stock: 1 }] }))).toBe('sizes')
    expect(fieldOf(baseInput({ sizes: [{ size: 42, stock: -1 }] }))).toBe('sizes')
  })

  it('refuse deux pointures identiques', () => {
    expect(
      fieldOf(
        baseInput({
          sizes: [
            { size: 42, stock: 1 },
            { size: 42, stock: 2 },
          ],
        }),
      ),
    ).toBe('sizes')
  })
})

describe('options exposees', () => {
  it('palettes et genres non vides', () => {
    expect(PALETTE_OPTIONS.length).toBeGreaterThan(0)
    expect(GENDER_OPTIONS).toContain('unisexe')
  })
})

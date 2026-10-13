import { describe, expect, it } from 'vitest'
import { groupByModel, toVariant } from '@/lib/catalog'
import type { SneakerProduct } from '@/types/product'

function product(overrides: Partial<SneakerProduct> & { id: string }): SneakerProduct {
  return {
    slug: overrides.id,
    name: 'Q2M Model',
    brand: 'Q2M',
    price: 249,
    palette: 'onyx',
    colorway: 'Standard',
    images: [],
    sizes: [{ size: 42, stock: 1 }],
    ...overrides,
  }
}

describe('toVariant', () => {
  it('projette la fiche en coloris, image = premier visuel', () => {
    const variant = toVariant(
      product({ id: 'v1', slug: 'v1', colorway: 'Bone', images: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'], price: 199, isSoldOut: true }),
    )

    expect(variant).toEqual({
      id: 'v1',
      slug: 'v1',
      colorway: 'Bone',
      palette: 'onyx',
      image: 'https://cdn.test/a.jpg',
      price: 199,
      isSoldOut: true,
    })
  })

  it('image absente quand la fiche n\'a pas de visuel', () => {
    const variant = toVariant(product({ id: 'v2' }))
    expect(variant.image).toBeUndefined()
    expect(variant.isSoldOut).toBe(false)
  })
})

describe('groupByModel', () => {
  it('fiche seule : un groupe, une variante', () => {
    const groups = groupByModel([product({ id: 'a' })])

    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe('a')
    expect(groups[0].variants).toHaveLength(1)
  })

  it('rattache un coloris a sa racine meme si non adjacent', () => {
    const groups = groupByModel([
      product({ id: 'child', parentId: 'root' }),
      product({ id: 'other' }),
      product({ id: 'root', parentId: null }),
    ])

    expect(groups).toHaveLength(2)
    const model = groups.find((g) => g.variants!.some((v) => v.id === 'child'))!
    expect(model.variants!.map((v) => v.id).sort()).toEqual(['child', 'root'])
  })

  it('la racine sert de representant quand elle a une photo', () => {
    const groups = groupByModel([
      product({ id: 'root', parentId: null, images: ['https://cdn.test/root.jpg'] }),
      product({ id: 'child', parentId: 'root', images: ['https://cdn.test/child.jpg'] }),
    ])

    expect(groups[0].id).toBe('root')
  })

  it('un coloris photographie remplace une racine sans photo', () => {
    const groups = groupByModel([
      product({ id: 'root', parentId: null }),
      product({ id: 'child', parentId: 'root', images: ['https://cdn.test/child.jpg'] }),
    ])

    expect(groups[0].id).toBe('child')
    expect(groups[0].variants).toHaveLength(2)
  })

  it('la racine reprend la main si aucun membre n\'a de photo', () => {
    const groups = groupByModel([
      product({ id: 'child', parentId: 'root' }),
      product({ id: 'root', parentId: null }),
    ])

    expect(groups[0].id).toBe('root')
  })

  it('conserve l\'ordre d\'apparition des modeles', () => {
    const groups = groupByModel([
      product({ id: 'b' }),
      product({ id: 'a' }),
    ])

    expect(groups.map((g) => g.id)).toEqual(['b', 'a'])
  })
})

import { describe, expect, it } from 'vitest'
import {
  applyPercentage,
  resolveDiscountPercentage,
  type ActivePromotion,
} from '@/lib/promotions'

function promo(overrides: Partial<ActivePromotion> = {}): ActivePromotion {
  return {
    id: 'promo-1',
    type: 'PRODUCT',
    targets: ['*'],
    percentage: 10,
    ...overrides,
  }
}

describe('applyPercentage', () => {
  it('applique la remise et arrondit au centime', () => {
    expect(applyPercentage(249, 10)).toBe(224.1)
    expect(applyPercentage(150, 15)).toBe(127.5)
  })

  it('ne modifie pas le prix a 0 %', () => {
    expect(applyPercentage(249, 0)).toBe(249)
  })

  it('plafonne a 90 %', () => {
    expect(applyPercentage(100, 150)).toBe(10)
  })
})

describe('resolveDiscountPercentage', () => {
  it('cible tout le catalogue avec ["*"]', () => {
    const promotions = [promo({ targets: ['*'], percentage: 20 })]
    expect(resolveDiscountPercentage({ id: 'p1' }, promotions)).toBe(20)
  })

  it('ne cible que le produit par identifiant', () => {
    const promotions = [promo({ type: 'PRODUCT', targets: ['p1'], percentage: 25 })]
    expect(resolveDiscountPercentage({ id: 'p1' }, promotions)).toBe(25)
    expect(resolveDiscountPercentage({ id: 'p2' }, promotions)).toBe(0)
  })

  it('cible une categorie via categoryId, jamais via id produit', () => {
    const promotions = [promo({ type: 'CATEGORY', targets: ['cat-9'], percentage: 30 })]
    expect(resolveDiscountPercentage({ id: 'p1', categoryId: 'cat-9' }, promotions)).toBe(30)
    expect(resolveDiscountPercentage({ id: 'cat-9' }, promotions)).toBe(0)
    expect(resolveDiscountPercentage({ id: 'p1', categoryId: null }, promotions)).toBe(0)
  })

  it('retient le meilleur pourcentage quand plusieurs promotions matchent', () => {
    const promotions = [
      promo({ id: 'a', type: 'PRODUCT', targets: ['p1'], percentage: 15 }),
      promo({ id: 'b', type: 'CATEGORY', targets: ['cat-1'], percentage: 40 }),
      promo({ id: 'c', targets: ['*'], percentage: 5 }),
    ]
    expect(resolveDiscountPercentage({ id: 'p1', categoryId: 'cat-1' }, promotions)).toBe(40)
  })

  it('renvoie 0 sans promotion applicables', () => {
    expect(resolveDiscountPercentage({ id: 'p1' }, [])).toBe(0)
  })
})

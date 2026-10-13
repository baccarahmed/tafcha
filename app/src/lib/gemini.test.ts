import { describe, expect, it } from 'vitest'
import { normalizeSku, toDraft } from '@/lib/gemini'

describe('normalizeSku', () => {
  it('majuscules, espaces en tirets', () => {
    expect(normalizeSku('q2m bone 014', 'Q2M')).toBe('Q2M-BONE-014')
  })

  it('retire les accents et la ponctuation', () => {
    expect(normalizeSku('Édition Été!!', 'Q2M')).toBe('EDITION-ETE')
  })

  it('compacte les tirets repetes et les bords', () => {
    expect(normalizeSku('--A--B--', 'Q2M')).toBe('A-B')
  })

  it('replie sur un prefixe de marque si trop court', () => {
    expect(normalizeSku('x', 'Nike')).toBe('NIKE')
  })

  it('replie sur Q2M si la marque est vide', () => {
    expect(normalizeSku('', '!!!')).toBe('Q2M')
  })

  it('ignore une valeur non-chaine', () => {
    expect(normalizeSku(42, 'Q2M')).toBe('Q2M')
  })

  it('plafonne a 40 caracteres', () => {
    expect(normalizeSku('A'.repeat(60), 'Q2M').length).toBe(40)
  })
})

describe('toDraft', () => {
  it('rejette une valeur non-objet', () => {
    expect(toDraft(null)).toBeNull()
    expect(toDraft('texte')).toBeNull()
  })

  it('rejette un nom trop court', () => {
    expect(toDraft({ name: 'A' })).toBeNull()
  })

  it('normalise une reponse complete', () => {
    const draft = toDraft({
      name: '  Phantom  ',
      brand: ' Jordan ',
      sku: 'aj1 black 014',
      colorway: ' Black ',
      description: '  desc  ',
      gender: 'homme',
      palette: 'void',
    })

    expect(draft).toEqual({
      name: 'Phantom',
      brand: 'Jordan',
      sku: 'AJ1-BLACK-014',
      colorway: 'Black',
      description: 'desc',
      gender: 'homme',
      palette: 'void',
    })
  })

  it('applique les replis pour genre, palette, colorway et marque', () => {
    const draft = toDraft({ name: 'Model X', sku: 'X-1' })

    expect(draft).toMatchObject({
      brand: 'Q2M',
      colorway: 'Standard',
      gender: 'unisexe',
      palette: 'onyx',
      description: '',
    })
  })

  it('ignore un genre ou une palette inconnus', () => {
    const draft = toDraft({ name: 'Model X', gender: 'robot', palette: 'rose' })
    expect(draft?.gender).toBe('unisexe')
    expect(draft?.palette).toBe('onyx')
  })
})

import { describe, expect, it } from 'vitest'
import { intlLocale, slugify, truncate } from '@/lib/utils'

describe('slugify', () => {
  it('minuscule, espaces en tirets', () => {
    expect(slugify('Air Jordan 1 Mid')).toBe('air-jordan-1-mid')
  })

  it('retire les accents', () => {
    expect(slugify('Élan Noël')).toBe('elan-noel')
  })

  it('compacte la ponctuation et les tirets de bord', () => {
    expect(slugify('  --Sneaker!!  x  ')).toBe('sneaker-x')
  })

  it('plafonne a 80 caracteres', () => {
    expect(slugify('a'.repeat(120)).length).toBe(80)
  })

  it('renvoie une chaine vide si rien d\'exploitable', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('truncate', () => {
  it('laisse intact en dessous de la limite', () => {
    expect(truncate('court', 10)).toBe('court')
  })

  it('coupe et suffixe', () => {
    expect(truncate('abcdef', 3)).toBe('abc...')
  })
})

describe('intlLocale', () => {
  it('mappe les langues sur la region tunisienne', () => {
    expect(intlLocale('ar')).toBe('ar-TN')
    expect(intlLocale('en')).toBe('en-TN')
  })

  it('retombe sur le francais par defaut', () => {
    expect(intlLocale(undefined)).toBe('fr-TN')
    expect(intlLocale('de')).toBe('fr-TN')
  })
})

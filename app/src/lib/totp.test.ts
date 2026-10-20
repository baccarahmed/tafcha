import { describe, expect, it } from 'vitest'
import { base32Decode, base32Encode, generateTotpSecret, totpCode, totpUri, verifyTotp } from './totp'

/**
 * Vecteurs de test officiels RFC 6238 (Annexe B) : secret ASCII
 * "12345678901234567890" (=> GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ en base32),
 * codes a 8 chiffres, HMAC-SHA1. Le generateur doit les reproduire a
 * l'identique pour chaque pas de 30 s.
 */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

const RFC_VECTORS: Array<[number, string]> = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
]

describe('base32 (RFC 4648)', () => {
  it('encode puis decode un octet aleatoire', () => {
    const bytes = Buffer.from('q2m-securite-mfa', 'utf8')
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true)
  })

  it('produit les formes canoniques connues', () => {
    expect(base32Encode(Buffer.from('foobar', 'utf8'))).toBe('MZXW6YTBOI')
    expect(base32Encode(Buffer.from('f', 'utf8'))).toBe('MY')
    expect(base32Encode(Buffer.from('fo', 'utf8'))).toBe('MZXQ')
    expect(base32Encode(Buffer.from('foo', 'utf8'))).toBe('MZXW6')
  })

  it('rejette un alphabet invalide', () => {
    expect(() => base32Decode('MZ0W6')).toThrow('invalid base32')
  })
})

describe('TOTP (RFC 6238)', () => {
  it('reproduit tous les vecteurs officiels HMAC-SHA1', () => {
    for (const [epochSeconds, expected] of RFC_VECTORS) {
      expect(totpCode(RFC_SECRET, epochSeconds * 1000, 30, 8)).toBe(expected)
    }
  })

  it('verifie le code de la periode courante et rejette un code faux', () => {
    const atMs = 1234567890 * 1000
    const code = totpCode(RFC_SECRET, atMs, 30, 6)
    expect(verifyTotp(RFC_SECRET, code, { atMs })).toBe(true)
    expect(verifyTotp(RFC_SECRET, '000000', { atMs })).toBe(false)
  })

  it('accepte une derive de periode (horloge decalee) mais pas au-dela', () => {
    const atMs = 1234567890 * 1000
    const previous = totpCode(RFC_SECRET, atMs - 30_000, 30, 6)
    const twoStepsAgo = totpCode(RFC_SECRET, atMs - 60_000, 30, 6)
    expect(verifyTotp(RFC_SECRET, previous, { atMs })).toBe(true)
    expect(verifyTotp(RFC_SECRET, twoStepsAgo, { atMs })).toBe(false)
  })

  it('rejette un code de mauvaise longueur ou non numerique', () => {
    const atMs = Date.now()
    expect(verifyTotp(RFC_SECRET, '12345', { atMs })).toBe(false)
    expect(verifyTotp(RFC_SECRET, 'abcdef', { atMs })).toBe(false)
    expect(verifyTotp(RFC_SECRET, '1234567', { atMs })).toBe(false)
  })

  it('genere des secrets valides et differents', () => {
    const a = generateTotpSecret()
    const b = generateTotpSecret()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Z2-7]{32}$/)
    // Un secret genere doit verifier son propre code.
    const atMs = Date.now()
    expect(verifyTotp(a, totpCode(a, atMs), { atMs })).toBe(true)
  })
})

describe('totpUri', () => {
  it('construit un otpauth:// conforme', () => {
    const uri = totpUri({ secret: 'AAAA', account: 'admin@q2m.tn', issuer: 'Q2M' })
    expect(uri).toBe('otpauth://totp/Q2M%3Aadmin%40q2m.tn?secret=AAAA&issuer=Q2M&algorithm=SHA1&digits=6&period=30')
  })
})

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * TOTP (RFC 6238) / HOTP (RFC 4226), implementation minimale sans dependance.
 *
 * Utilise pour le MFA admin (VULN-001). On evite d'ajouter une bibliotheque
 * tierce a un module de securite : HMAC-SHA1 + base32 tiennent en quelques
 * lignes et sont valides par les vecteurs de test officiels RFC 6238 (Annexe B),
 * reproduits dans totp.test.ts.
 *
 * Parametres : 6 chiffres, periode 30 s, SHA1 — les defauts identifies par
 * l'RFC et supportes par tous les authenticateurs (Google, Authy, 1Password...).
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** RFC 4648 : encodage base32 sans padding (format des secrets TOTP). */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=]/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const index = BASE32_ALPHABET.indexOf(ch)
    if (index === -1) throw new Error('invalid base32')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** Genere un secret aleatoire de 160 bits (longueur recommandee par l'RFC). */
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes))
}

/** Code TOTP pour un instant donne (testable avec une date fixe). */
export function totpCode(
  secretBase32: string,
  atMs: number = Date.now(),
  periodSec = 30,
  digits = 6
): string {
  const counter = Math.floor(atMs / 1000 / periodSec)
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))

  const hmac = createHmac('sha1', base32Decode(secretBase32))
    .update(counterBuf)
    .digest()

  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3]

  return String(binary % 10 ** digits).padStart(digits, '0')
}

/** Comparaison a temps constant : ne pas laisser deviner le code par timing. */
function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Verifie un code saisi. Tolere `window` periodes de derive (±1 par defaut)
 * pour absorber le decalage d'horloge des appareils, sans ouvrir la porte
 * a la reutilisation : le code reste lie a la periode en cours.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  options?: { atMs?: number; window?: number; periodSec?: number; digits?: number }
): boolean {
  if (!/^\d{6}$/.test(code)) return false

  const atMs = options?.atMs ?? Date.now()
  const window = options?.window ?? 1
  const periodSec = options?.periodSec ?? 30
  const digits = options?.digits ?? 6

  for (let step = -window; step <= window; step++) {
    const candidate = totpCode(secretBase32, atMs + step * periodSec * 1000, periodSec, digits)
    if (constantTimeEquals(candidate, code)) return true
  }
  return false
}

/**
 * URI otpauth:// a saisir ou scanner dans l'authenticateur. L'appelant ne
 * doit jamais l'afficher en contexte public (il contient le secret).
 */
export function totpUri(input: { secret: string; account: string; issuer: string }): string {
  const label = encodeURIComponent(`${input.issuer}:${input.account}`)
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

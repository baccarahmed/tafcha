import 'server-only'

/**
 * Limitation de debit pour les routes publiques (contact, newsletter).
 *
 * Table en memoire par instance de serveur : pas de dependance externe, mais
 * ephemere et non partage entre instances. C'est volontairement la couche
 * minimale qui suffit a arreter un spammeur ; un besoin d'agregat multi-pods
 * demanderait un stockage partage (InsForge / Upstash).
 */

type Bucket = { hits: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Garde-fou si la cle comporte un IP inconnu : on vide plutot que de grossir sans limite. */
const MAX_BUCKETS = 10_000

export interface RateLimitResult {
  ok: boolean
  /** Appels restants dans la fenetre courante. */
  remaining: number
  /** Secondes a attendre avant un nouvel essai (0 quand la requete est acceptee). */
  retryAfter: number
}

/**
 * Adresse client pour la cle de limitation (durcissement pentest F-RL-1).
 *
 * `x-forwarded-for` est concatenable par un client direct : le PREMIER
 * element est donne par le client (spoofable), seul le DERNIER — ajoute par
 * le proxy de confiance en front — est fiable. On prefere `x-real-ip` quand
 * le frontal le renseigne, sinon on prend le dernier segment de
 * `x-forwarded-for`. Sans proxy (dev/direct), on retombe sur une cle commune
 * 'unknown' : mieux vaut limiter collectivement que laisser la rotation
 * d'en-tetes contourner le debit.
 *
 * Limite connue : si l'hebergement ne place pas d'adresse fiable dans un de
 * ces en-tetes (front sans proxy HTTP qui normalise), un attaquant peut
 * toujours rotater l'en-tete — la couche definitive reste un compteur
 * persistant partage (InsForge DB / Upstash).
 */
export function clientIp(request: Request): string {
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real

  const forwarded = request.headers.get('x-forwarded-for')
  const segments = forwarded
    ?.split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
  const last = segments?.[segments.length - 1]
  if (last) return last

  return 'unknown'
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()

  if (buckets.size > MAX_BUCKETS) {
    for (const [entry, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(entry)
    }
    if (buckets.size > MAX_BUCKETS) buckets.clear()
  }

  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs })
    return { ok: true, remaining: max - 1, retryAfter: 0 }
  }

  if (bucket.hits >= max) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.hits += 1
  return { ok: true, remaining: max - bucket.hits, retryAfter: 0 }
}

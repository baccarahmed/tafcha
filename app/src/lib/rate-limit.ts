import 'server-only'

import { insforgeAdmin } from '@/lib/insforge-admin'

/**
 * Limitation de debit partagee entre toutes les instances serverless.
 *
 * Correction VULN-002 (audit) : la version precedente comptait en memoire
 * locale, donc chaque lambda Vercel avait son propre compteur et l'agregat
 * multi-instances etait inoperant (5 essais x N instances). Le compteur de
 * reference est desormais la table InsForge `rate_limits`, mise a jour par un
 * seul appel SQL atomique (`public.rate_limit_hit`, migration
 * 20261019145558_shared-rate-limit.sql) qui retourne la decision.
 *
 * De couches, du plus rapide au plus sur :
 *   1. memoire locale — rejet immediat quand l'instance a deja atteint le
 *      plafond (inutile d'un aller-retour SQL pour refuser) ; ne sert jamais
 *      a autoriser seule ;
 *   2. base partagee — source de verite : agrège les tentatives de toutes
 *      les instances.
 *
 * Si la base est indisponible, on retombe sur la couche memoire (meilleur
 * que rien) plutot que de faire tomber le service : le rate-limit protege
 * contre le spam, il ne doit pas devenir une source d'indisponibilite.
 *
 * Appele uniquement cote serveur (server actions, routes) : la table et la
 * fonction sont REVOKEes a anon/authenticated, un visiteur ne peut ni
 * appeler le compteur, ni observer les cles (qui contiennent des e-mails).
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

/** Tout porteur d'en-tetes HTTP : `Request`, `Headers` ou `headers()` de Next. */
interface HeaderBag {
  get(name: string): string | null
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
 * Source unique partagee par les route handlers (`clientIp`) et les Server
 * Actions (qui n'ont pas de `Request`, seulement `headers()`).
 */
export function ipFromHeaders(headers: HeaderBag): string {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real

  const forwarded = headers.get('x-forwarded-for')
  const segments = forwarded
    ?.split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
  const last = segments?.[segments.length - 1]
  if (last) return last

  return 'unknown'
}

export function clientIp(request: Request): string {
  return ipFromHeaders(request.headers)
}

/**
 * Couche memoire (fenetre fixe par instance). Sert au rejet immediat et de
 * repli si la base partagee est hors service.
 */
function memoryHit(key: string, max: number, windowMs: number): RateLimitResult {
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

/**
 * Compteur partage : rejet local immediat si plafond atteint, sinon on
 * compte et decide en base via `rate_limit_hit` (atomique, toutes instances
 * confondues). Repli memoire quand la base ne repond pas.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const local = memoryHit(key, max, windowMs)
  if (!local.ok) return local

  try {
    const { data, error } = await insforgeAdmin().database.rpc('rate_limit_hit', {
      p_key: key,
      p_max: max,
      p_window_ms: windowMs,
    })
    if (error || !data) throw new Error(error?.message ?? 'rate_limit_hit: no data')

    const shared = data as { ok?: unknown; remaining?: unknown; retryAfter?: unknown }
    return {
      ok: shared.ok === true,
      remaining: Number(shared.remaining ?? 0),
      retryAfter: Number(shared.retryAfter ?? 0),
    }
  } catch (dbError) {
    // Repli memoire : la decision locale reste valable pour cette instance.
    console.error('rate-limit: compteur partage indisponible, repli memoire', dbError)
    return local
  }
}

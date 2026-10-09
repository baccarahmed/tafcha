/**
 * Gestion du parametre `next` : destination interne apres connexion.
 *
 * Un simple `startsWith('/')` ne suffit pas. `/\evil.com` ou `/%5cevil.com`
 * sont interpretes comme une origin externe par les agents de redirection du
 * navigateur, et `//evil.com` est un protocole-relatif. On resout la
 * destination contre un hote factice : si l'origin de resultat differe, la
 * chaine a ete reinterpretee comme externe.
 */

const RETURN_ORIGIN = 'https://q2m.internal'

export function safeReturnPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  // `new URL` normalise ces caracteres, on les rejette quand meme explicitement
  // pour ne pas dependre d'une implementation d'agent.
  if (raw.includes('\\') || raw.includes('\n') || raw.includes('\r')) return null

  try {
    const url = new URL(raw, RETURN_ORIGIN)
    if (url.origin !== RETURN_ORIGIN) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

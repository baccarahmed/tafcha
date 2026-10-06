import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { updateSession } from '@insforge/sdk/ssr/middleware'
import { routing } from '@/i18n/routing'

/** Resolves /shop to /fr/shop, keeps /api/* and static assets untouched. */
const handleI18n = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const intlResponse = handleI18n(request)

  // Locale redirects must win — do not spend a refresh round-trip on them.
  if (intlResponse.headers.get('location')) return intlResponse

  // A locale-prefixed path still needs its dynamic segment stripped for the
  // session lookup, so run the refresh on the same response object.
  const response =
    intlResponse instanceof NextResponse && intlResponse.ok
      ? intlResponse
      : NextResponse.next({ request })

  await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  })

  return response
}

export const config = {
  /*
   * Next internals, InsForge, any file with an extension, and every `/api/*`
   * route. Les routes API ne sont pas prefixees par une locale : si le
   * middleware next-intl les touchait, `/api/contact` serait redirige vers
   * `/fr/api/contact`, qui n'existe pas, et le formulaire de contact repondrait
   * 404 quel que soit le code serveur.
   */
  matcher: ['/((?!_next|_vercel|api|.*\\..*).*)'],
}
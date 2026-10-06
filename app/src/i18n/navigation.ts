import { createNavigation } from 'next-intl/navigation';
import { routing, type Locale } from './routing';

const navigation = createNavigation(routing);

export const Link = navigation.Link;
export const usePathname = navigation.usePathname;
export const useRouter = navigation.useRouter;
export const getPathname = navigation.getPathname;

interface RedirectArgs {
  href: string;
  locale: Locale;
}

/**
 * Wrapped with an explicit `never` return type so TypeScript keeps the
 * control-flow narrowing that tells callers this call never returns.
 */
export function redirect({ href, locale }: RedirectArgs): never {
  return navigation.redirect({ href, locale });
}
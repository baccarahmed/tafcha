'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { Home, Store, Heart, ShoppingBag, User, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart-store'
import { useWishlistStore } from '@/store/wishlist-store'

const spring = { type: 'spring', stiffness: 420, damping: 34 } as const

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      className="absolute -top-1.5 end-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black tabular-nums"
      style={{ background: 'var(--q2m-accent)', color: 'var(--q2m-on-accent)' }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/**
 * Sticky mobile tab bar (< lg). A translucent material that content scrolls
 * under, mirroring the always-black chrome. The active indicator is a shared
 * spring-animated rule; `prefers-reduced-motion` drops the shared layout so
 * the state change is instant instead of travelling.
 */
export function StorefrontBottomNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const totalItems = useCartStore((s) => s.totalItems)
  const openCart = useCartStore((s) => s.openCart)
  const wishlistCount = useWishlistStore((s) => s.items.length)

  const links: { key: string; href: string; icon: LucideIcon; count?: number }[] = [
    { key: 'home', href: '/', icon: Home },
    { key: 'shop', href: '/shop', icon: Store },
    { key: 'wishlist', href: '/favorites', icon: Heart, count: wishlistCount },
    { key: 'account', href: '/account', icon: User },
  ]

  const tabClass =
    'relative flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold tracking-[0.08em] uppercase transition-[color,transform] duration-140 ease-q2m active:scale-[0.94]'

  const indicator = (active: boolean) =>
    active ? (
      <motion.span
        layoutId={reduceMotion ? undefined : 'q2m-bottom-nav-indicator'}
        transition={spring}
        className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-[var(--q2m-accent)]"
        aria-hidden
      />
    ) : null

  return (
    <nav
      aria-label={t('primaryNav')}
      className="q2m-bottom-nav fixed inset-x-0 bottom-0 z-30 lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {/* Home + Shop on the leading side, cart in the middle for reach */}
        {links.slice(0, 2).map(({ key, href, icon: Icon, count }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`${tabClass} ${
                active
                  ? 'text-[var(--q2m-accent)]'
                  : 'text-[var(--q2m-on-dark-soft)]'
              }`}
            >
              {indicator(active)}
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Icon size={20} strokeWidth={active ? 2 : 1.75} aria-hidden />
                {typeof count === 'number' && <TabBadge count={count} />}
              </span>
              <span>{t(key)}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={openCart}
          aria-label={totalItems > 0 ? `${t('cart')} (${totalItems})` : t('cart')}
          className={`${tabClass} text-[var(--q2m-on-dark-soft)]`}
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            <ShoppingBag size={20} strokeWidth={1.75} aria-hidden />
            <TabBadge count={totalItems} />
          </span>
          <span>{t('cart')}</span>
        </button>

        {links.slice(2).map(({ key, href, icon: Icon, count }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`${tabClass} ${
                active
                  ? 'text-[var(--q2m-accent)]'
                  : 'text-[var(--q2m-on-dark-soft)]'
              }`}
            >
              {indicator(active)}
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Icon size={20} strokeWidth={active ? 2 : 1.75} aria-hidden />
                {typeof count === 'number' && <TabBadge count={count} />}
              </span>
              <span>{t(key)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

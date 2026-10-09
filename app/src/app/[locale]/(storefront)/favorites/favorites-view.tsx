'use client'

import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import SneakerVisual from '@/components/storefront/SneakerVisual'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'
import { formatCurrency } from '@/lib/utils'
import { useWishlistStore, type WishlistItem } from '@/store/wishlist-store'

function FavoriteCard({ item, index }: { item: WishlistItem; index: number }) {
  const t = useTranslations('favorites')
  const locale = useLocale()
  const remove = useWishlistStore((s) => s.removeItem)

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative"
    >
      <Link href={`/product/${item.slug}`} className="block">
        <div
          className="relative aspect-[319/300] w-full overflow-hidden border border-transparent p-3.5 transition-[border-color] duration-300 group-hover:border-[var(--q2m-accent)]"
          style={{ background: Q2M.bone, borderRadius: 8 }}
        >
          <SneakerVisual variant={item.palette} />
        </div>

        <div className="mt-3 flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--q2m-ink-mute)]">
              {t('saved')}
            </span>
            <span className="text-sm font-extrabold tabular-nums" style={{ color: Q2M.ink }}>
              {formatCurrency(item.price, locale)}
            </span>
          </div>
          <h2 className="text-base font-extrabold leading-tight" style={{ color: Q2M.ink }}>
            {item.name}
          </h2>
        </div>
      </Link>

      <button
        type="button"
        aria-label={t('remove')}
        onClick={() => remove(item.productId)}
        className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center transition-all duration-200 hover:border hover:border-[var(--q2m-alert)] active:scale-90"
        style={{ background: Q2M.bgElevated, borderRadius: '999px', color: Q2M.accent }}
      >
        <Heart size={15} strokeWidth={1.5} fill="currentColor" />
      </button>
    </motion.article>
  )
}

export default function FavoritesView() {
  const t = useTranslations('favorites')
  const items = useWishlistStore((s) => s.items)

  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pt-24 pb-10 lg:px-14">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--q2m-accent-text)]"
        >
          {t('kicker')}
        </motion.p>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl font-black uppercase leading-none tracking-[-0.02em] md:text-7xl"
          >
            {t('title')}
          </motion.h1>

          {items.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute">
              {t('count', { count: items.length })}
            </span>
          )}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-xl leading-relaxed text-ink-soft"
        >
          {t('lead')}
        </motion.p>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 sm:px-10 pb-24 lg:px-14">
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col items-center gap-4 border border-line py-24 text-center"
          >
            <Heart size={32} strokeWidth={1.5} className="text-ink-mute" />
            <p className="text-lg font-bold">{t('empty')}</p>
            <p className="max-w-md text-sm text-ink-mute">{t('emptyHint')}</p>
            <Link href="/shop" className="q2m-btn-primary mt-2">
              {t('browse')}
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4.5 gap-y-7 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-[18px]">
            {items.map((item, index) => (
              <FavoriteCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
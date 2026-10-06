'use client'

import { motion } from 'framer-motion'
import { Heart, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'
import { formatCurrency } from '@/lib/utils'
import SneakerVisual from '@/components/storefront/SneakerVisual'
import { useWishlistStore } from '@/store/wishlist-store'

export default function FavoritesView() {
  const t = useTranslations('favorites')
  const locale = useLocale()
  const items = useWishlistStore((s) => s.items)
  const removeItem = useWishlistStore((s) => s.removeItem)

  return (
    <main style={{ background: Q2M.bg, fontFamily: Q2M_FONT }}>
      <section className="mx-auto max-w-[1440px] px-6 pt-24 pb-10 lg:px-12">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-accent"
        >
          {t('kicker')}
        </motion.p>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl font-black leading-none tracking-[-0.03em] md:text-7xl"
          >
            {t('title')}
          </motion.h1>

          {items.length > 0 && (
            <span className="font-mono text-xs text-ink-mute">
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

      <section className="mx-auto max-w-[1440px] px-6 pb-24 lg:px-12">
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col items-center gap-5 border border-line py-24 text-center"
          >
            <Heart size={32} strokeWidth={1.5} className="text-ink-mute" />
            <div>
              <p className="text-lg font-semibold">{t('empty')}</p>
              <p className="mt-2 text-sm text-ink-mute">{t('emptyHint')}</p>
            </div>
            <Link
              href="/shop"
              className="border-2 border-[#FFE500] bg-[#FFE500] px-6 py-3 font-mono text-[11px] font-black tracking-[0.15em] text-on-accent"
            >
              {t('browse')}
            </Link>
          </motion.div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, idx) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group flex flex-col border border-line bg-surface"
              >
                <Link
                  href={`/product/${item.slug}`}
                  className="relative block aspect-square overflow-hidden bg-elevated"
                >
                  <SneakerVisual variant={item.palette} />
                </Link>

                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="text-base font-bold leading-tight text-ink">{item.name}</h2>

                  <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                    <span className="text-lg font-black tabular-nums text-ink">
                      {formatCurrency(item.price, locale)}
                    </span>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/product/${item.slug}`}
                        className="border border-line px-3 py-2 font-mono text-[10px] font-bold tracking-wider text-ink-soft transition-colors hover:border-[#FFE500] hover:text-accent"
                      >
                        {t('view')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label={t('remove')}
                        className="flex h-9 w-9 items-center justify-center border border-line text-ink-mute transition-colors hover:border-[#FF4D2E] hover:text-[#FF4D2E]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
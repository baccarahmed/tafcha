'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Search as SearchIcon, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'
import { formatCurrency } from '@/lib/utils'
import SneakerVisual from '@/components/storefront/SneakerVisual'
import type { CatalogProduct } from '@/types/catalog'

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Arabic diacritics and tatweel would otherwise break a typed query.
    .replace(/[ً-ٰٟـ]/g, '')
}

export default function SearchView({ products }: { products: CatalogProduct[] }) {
  const t = useTranslations('search')
  const locale = useLocale()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const needle = normalize(query.trim())
    if (!needle) return products

    return products.filter((product) => {
      const haystack = normalize(
        [product.name, product.brand, product.colorway, product.categorySlug ?? ''].join(' ')
      )
      return haystack.includes(needle)
    })
  }, [products, query])

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

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl font-black leading-none tracking-[-0.03em] md:text-7xl"
        >
          {t('title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-xl leading-relaxed text-ink-soft"
        >
          {t('lead')}
        </motion.p>

        <div className="relative mt-10 max-w-2xl">
          <SearchIcon
            size={18}
            strokeWidth={1.75}
            className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-mute"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('placeholder')}
            aria-label={t('label')}
            className="h-14 w-full border border-line bg-elevated ps-12 pe-12 text-base text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-[#FFE500]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('clear')}
              className="absolute end-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-ink-mute transition-colors hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <p className="mt-5 font-mono text-xs text-ink-mute" aria-live="polite">
          {t('results', { count: results.length })}
        </p>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-24 lg:px-12">
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-5 border border-line py-24 text-center">
            <p className="text-lg font-semibold">{t('noResults', { query: query.trim() })}</p>
            <p className="text-sm text-ink-mute">{t('noResultsHint')}</p>
            <Link
              href="/shop"
              className="border-2 border-[#FFE500] bg-[#FFE500] px-6 py-3 font-mono text-[11px] font-black tracking-[0.15em] text-on-accent"
            >
              {t('browse')}
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((product, idx) => (
              <motion.li
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(idx, 8) * 0.04 }}
              >
                <Link
                  href={`/product/${product.slug}`}
                  className="group flex h-full flex-col border border-line bg-surface transition-colors hover:border-[#FFE500]"
                >
                  <span className="relative block aspect-square overflow-hidden bg-elevated">
                    {product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <SneakerVisual variant={product.palette} />
                    )}
                  </span>

                  <span className="flex flex-1 flex-col gap-2 p-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-mute">
                      {product.brand}
                    </span>
                    <span className="text-base font-bold leading-tight text-ink">
                      {product.name}
                    </span>
                    <span className="mt-auto block pt-3 text-lg font-black tabular-nums text-ink">
                      {formatCurrency(product.price, locale)}
                    </span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

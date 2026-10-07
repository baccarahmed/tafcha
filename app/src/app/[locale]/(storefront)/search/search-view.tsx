'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search as SearchIcon, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Q2MProductCard } from '@/components/storefront/Q2MProductCard'
import { Q2M, Q2M_FONT } from '@/lib/q2m-tokens'
import type { CatalogProduct } from '@/types/catalog'

/**
 * Requete insensible a la casse et aux accents. Les diacritiques arabes sont
 * retirees egalement : taper « sneaker » doit aussi trouver « سنيكر ».
 */
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
}

export default function SearchView({ products }: { products: CatalogProduct[] }) {
  const t = useTranslations('search')
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
          className="mb-4 text-[11px] font-extrabold tracking-[0.16em] text-[var(--q2m-accent-text)]"
        >
          {t('kicker')}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl font-black uppercase leading-none tracking-[-0.02em] md:text-7xl"
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
            className="h-14 w-full border border-[var(--q2m-line-strong)] bg-[var(--q2m-bg-elevated)] ps-12 pe-12 text-base text-ink outline-none transition-colors placeholder:text-ink-mute focus:border-accent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('clear')}
              className="absolute end-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-ink-mute transition-colors hover:text-[var(--q2m-alert)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute" aria-live="polite">
          {t('results', { count: results.length })}
        </p>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 pb-24 lg:px-12">
        {results.length === 0 ? (
          <div className="flex flex-col items-center gap-4 border border-line py-24 text-center">
            <p className="text-lg font-bold">{t('noResults', { query: query.trim() })}</p>
            <p className="text-sm text-ink-mute">{t('noResultsHint')}</p>
            <Link href="/shop" className="q2m-btn-primary mt-2">
              {t('browse')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4.5 gap-y-7 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-[18px]">
            {results.map((product) => (
              <Q2MProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
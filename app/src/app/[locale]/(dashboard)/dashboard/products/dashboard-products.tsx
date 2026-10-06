'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { AlertTriangle, ExternalLink, Package, Search } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import SneakerVisual from '@/components/storefront/SneakerVisual'
import { cn, formatCurrency } from '@/lib/utils'
import type { AdminEditableProduct } from '@/lib/admin-data'
import ProductEditor from './product-editor'
import ProductRowActions from './product-row-actions'

type StatusFilter = 'all' | 'live' | 'draft'

export default function DashboardProducts({
  products,
  categories,
}: {
  products: AdminEditableProduct[]
  categories: { id: string; name: string }[]
}) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const money = (amount: number) => formatCurrency(amount, locale)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()

    return products
      .map((product) => {
        const totalStock = product.sizes.reduce((sum, size) => sum + size.stock, 0)
        const sellable = product.sizes.filter((size) => size.stock > 0).length
        const potential = product.sizes.reduce(
          (sum, size) => sum + size.stock * product.price,
          0
        )
        return { product, totalStock, sellable, potential }
      })
      .filter(
        ({ product }) =>
          (status === 'all' ||
            (status === 'live' ? product.active : !product.active)) &&
          (!q ||
            product.name.toLowerCase().includes(q) ||
            (product.brand ?? '').toLowerCase().includes(q) ||
            (product.colorway ?? '').toLowerCase().includes(q) ||
            (product.sku ?? '').toLowerCase().includes(q))
      )
  }, [products, query, status])

  const inventoryValue = rows.reduce((sum, row) => sum + row.potential, 0)
  const units = rows.reduce((sum, row) => sum + row.totalStock, 0)
  const lowStockCount = rows.filter(
    (row) => row.totalStock > 0 && row.totalStock <= 5
  ).length
  const soldOutCount = rows.filter((row) => row.totalStock === 0).length
  const draftCount = products.filter((product) => !product.active).length

  const stockTone = (stock: number) =>
    stock === 0
      ? {
          label: t('soldOut'),
          className:
            'border-[var(--q2m-alert)] bg-[var(--q2m-alert)]/10 text-[var(--q2m-alert)]',
        }
      : stock <= 5
        ? {
            label: t('lowStock'),
            className:
              'border-[var(--q2m-status-soon)] bg-[var(--q2m-status-soon-bg)] text-[var(--q2m-status-soon)]',
          }
        : {
            label: t('inStock'),
            className:
              'border-[var(--q2m-status-open)] bg-[var(--q2m-status-open-bg)] text-[var(--q2m-status-open)]',
          }

  const cards = [
    { label: t('products'), value: String(rows.length), icon: Package },
    { label: t('lowStock'), value: String(lowStockCount), icon: AlertTriangle },
    { label: t('soldOut'), value: String(soldOutCount), icon: AlertTriangle },
  ]

  const filters: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: t('filterAll') },
    { value: 'live', label: t('published') },
    { value: 'draft', label: t('draft') },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]">
                {card.label}
              </p>
              <card.icon className="h-4 w-4 text-[var(--q2m-ink-stone)]" />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--q2m-ink)]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">
              {t('stockByProduct')}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--q2m-ink-stone)]">
              {money(inventoryValue)} · {units}
              {draftCount > 0 && ` · ${t('draftCount', { count: draftCount })}`}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex gap-1 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bone)] p-1">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatus(filter.value)}
                  className={cn(
                    'rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
                    status === filter.value
                      ? 'bg-[var(--q2m-bg-elevated)] text-[var(--q2m-ink)]'
                      : 'text-[var(--q2m-ink-mute)] hover:text-[var(--q2m-ink)]'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="q2m-input flex w-full items-center gap-2 px-3 py-2 sm:w-72">
              <Search className="h-4 w-4 shrink-0 text-[var(--q2m-ink-stone)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('searchProducts')}
                className="w-full bg-transparent text-sm text-[var(--q2m-ink)] outline-none placeholder:text-[var(--q2m-ink-stone)]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[var(--q2m-line-soft)]">
                {[
                  t('productCol'),
                  t('fieldSku'),
                  t('price'),
                  t('stock'),
                  t('availability'),
                  t('actions'),
                ].map((heading, index) => (
                  <th
                    key={heading}
                    className={cn(
                      'px-2 py-3 text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]',
                      index >= 2 && index <= 4 && 'text-end',
                      index === 5 && 'text-end'
                    )}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ product, totalStock, sellable }) => {
                const tone = stockTone(totalStock)

                return (
                  <tr
                    key={product.id}
                    className="border-b border-[var(--q2m-line-soft)] last:border-b-0"
                  >
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-sm bg-[var(--q2m-bone)]">
                          {product.images.length > 0 ? (
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              fill
                              sizes="56px"
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <SneakerVisual variant={product.palette} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--q2m-ink)]">
                            {product.name}
                          </p>
                          <p className="truncate text-xs text-[var(--q2m-ink-stone)]">
                            {[product.brand, product.colorway]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs uppercase tabular-nums text-[var(--q2m-ink-mute)]">
                      {product.sku ?? '—'}
                    </td>
                    <td className="px-2 py-3 text-end text-sm font-semibold tabular-nums text-[var(--q2m-ink)]">
                      {money(product.price)}
                    </td>
                    <td className="px-2 py-3 text-end text-sm tabular-nums text-[var(--q2m-ink-soft)]">
                      {totalStock}
                      <span className="text-xs text-[var(--q2m-ink-stone)]">
                        {' '}
                        ({sellable}/{product.sizes.length})
                      </span>
                    </td>
                    <td className="px-2 py-3 text-end">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em]',
                          tone.className
                        )}
                      >
                        {tone.label}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <ProductRowActions
                          productId={product.id}
                          isActive={product.active}
                          isFeatured={product.featured}
                          isNewDrop={product.isNewDrop}
                        />

                        <ProductEditor
                          product={product}
                          categories={categories}
                        />

                        <Link
                          href={`/product/${product.slug}`}
                          aria-label={t('backToStore')}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--q2m-line-soft)] text-[var(--q2m-ink-stone)] transition-colors hover:border-[var(--q2m-ink)] hover:text-[var(--q2m-ink)]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
            {query.trim()
              ? t('noProductMatch', { query: query.trim() })
              : t('noStock')}
          </p>
        )}
      </div>
    </div>
  )
}
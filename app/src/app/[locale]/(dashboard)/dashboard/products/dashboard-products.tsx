'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { AlertTriangle, ExternalLink, Package, Search } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import SneakerVisual from '@/components/storefront/SneakerVisual'
import { cn, formatCurrency } from '@/lib/utils'
import type { AdminEditableProduct } from '@/lib/admin-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
          className: 'bg-[var(--q2m-alert)]/10 text-[var(--q2m-alert)]',
        }
      : stock <= 5
        ? {
            label: t('lowStock'),
            className: 'bg-[var(--q2m-status-soon-bg)] text-[var(--q2m-status-soon)]',
          }
        : {
            label: t('inStock'),
            className: 'bg-[var(--q2m-status-open-bg)] text-[var(--q2m-status-open)]',
          }

  const cards = [
    { label: t('products'), value: String(rows.length), icon: Package },
    { label: t('lowStock'), value: String(lowStockCount), icon: AlertTriangle },
    { label: t('soldOut'), value: String(soldOutCount), icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]">
                {card.label}
              </CardTitle>
              <card.icon className="h-4 w-4 text-[var(--q2m-ink-stone)]" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-[var(--q2m-ink)]">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
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
              <Tabs
                value={status}
                onValueChange={(value) => setStatus(value as StatusFilter)}
              >
                <TabsList>
                  <TabsTrigger value="all">{t('filterAll')}</TabsTrigger>
                  <TabsTrigger value="live">{t('published')}</TabsTrigger>
                  <TabsTrigger value="draft">{t('draft')}</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative sm:w-72">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--q2m-ink-stone)]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('searchProducts')}
                  className="ps-9"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('productCol')}</TableHead>
                  <TableHead>{t('fieldSku')}</TableHead>
                  <TableHead className="text-end">{t('price')}</TableHead>
                  <TableHead className="text-end">{t('stock')}</TableHead>
                  <TableHead className="text-end">{t('availability')}</TableHead>
                  <TableHead className="text-end">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ product, totalStock, sellable }) => {
                  const tone = stockTone(totalStock)

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-xs uppercase tabular-nums text-[var(--q2m-ink-mute)]">
                        {product.sku ?? '—'}
                      </TableCell>
                      <TableCell className="text-end text-sm font-semibold tabular-nums text-[var(--q2m-ink)]">
                        {money(product.price)}
                      </TableCell>
                      <TableCell className="text-end text-sm tabular-nums text-[var(--q2m-ink-soft)]">
                        {totalStock}
                        <span className="text-xs text-[var(--q2m-ink-stone)]">
                          {' '}
                          ({sellable}/{product.sizes.length})
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <Badge variant="outline" className={cn('uppercase', tone.className)}>
                          {tone.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <ProductRowActions
                            productId={product.id}
                            isActive={product.active}
                            isFeatured={product.featured}
                            isNewDrop={product.isNewDrop}
                          />

                          <ProductEditor product={product} categories={categories} />

                          <Button asChild variant="outline" size="icon" className="h-7 w-7 text-[var(--q2m-ink-stone)]">
                            <Link
                              href={`/product/${product.slug}`}
                              aria-label={t('backToStore')}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {rows.length === 0 && (
            <p className="py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
              {query.trim()
                ? t('noProductMatch', { query: query.trim() })
                : t('noStock')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
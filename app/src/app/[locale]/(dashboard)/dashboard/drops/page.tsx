import { getLocale, getTranslations } from 'next-intl/server'
import { getAdminProducts } from '@/lib/admin-data'
import { formatCurrency } from '@/lib/utils'

export default async function DashboardDropsPage() {
  const t = await getTranslations('dashboard')
  const locale = await getLocale()
  const money = (amount: number) => formatCurrency(amount, locale)
  const products = await getAdminProducts()

  const drops = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
      <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">{t('drops')}</h2>

      <ul className="mt-6 space-y-3">
        {drops.map((product) => (
          <li
            key={product.id}
            className="flex flex-col gap-2 border-b border-[var(--q2m-line-soft)] pb-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--q2m-ink)]">
                {product.name}
              </p>
              <p className="mt-0.5 text-xs text-[var(--q2m-ink-stone)]">
                {product.brand} · {money(product.price)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs tabular-nums text-[var(--q2m-ink-stone)]">
                {product.createdAt.slice(0, 10)}
              </span>
              <span
                className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] ${
                  product.isNewDrop
                    ? 'border-[var(--q2m-accent)] bg-[var(--q2m-accent)]/10 text-[var(--q2m-accent-text)]'
                    : 'border-[var(--q2m-line-strong)] text-[var(--q2m-ink-mute)]'
                }`}
              >
                {product.isNewDrop ? t('drops') : product.isActive ? t('published') : t('draft')}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {drops.length === 0 && (
        <p className="py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
          {t('noStock')}
        </p>
      )}
    </div>
  )
}

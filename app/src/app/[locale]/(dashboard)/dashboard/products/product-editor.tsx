'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { updateProductAction } from '@/app/actions/admin'
import { MAX_PRODUCT_IMAGES, cn } from '@/lib/utils'
import type { ProductGender, SneakerPalette } from '@/types/product'

const PALETTES: SneakerPalette[] = ['crimson', 'ember', 'void', 'volt', 'onyx']
const GENDERS: ProductGender[] = ['homme', 'femme', 'enfant', 'unisexe']

const inputClass =
  'q2m-input w-full px-3.5 py-2.5 text-sm text-[var(--q2m-ink)] placeholder:text-[var(--q2m-ink-stone)] outline-none'

const labelClass =
  'mb-2 block text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]'

const errorClass = 'mt-1.5 text-xs text-[var(--q2m-alert)]'

/** Formulaire d'edition d'une fiche produit existante. */
export interface EditableProduct {
  id: string
  name: string
  slug: string
  sku: string | null
  brand: string | null
  description: string | null
  colorway: string | null
  images: string[]
  price: number
  comparePrice: number | null
  categoryId: string | null
  gender: ProductGender
  palette: SneakerPalette
  sizes: { size: number; stock: number }[]
  featured: boolean
  active: boolean
  isNewDrop: boolean
}

/**
 * Edition en profondeur d'un produit deja en base.
 *
 * Le stock se saisit par pointure et non en total : `products.stock` n'est
 * qu'un cache recalcule cote serveur a partir des pointures, donc l'edituer
 * directement créerait un ecart entre le total affiche et la disponibilite
 * reellement vendable sur la fiche produit.
 */
export default function ProductEditor({
  product,
  categories,
}: {
  product: EditableProduct
  categories: { id: string; name: string }[]
}) {
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(product.name)
  const [slug, setSlug] = useState(product.slug)
  const [sku, setSku] = useState(product.sku ?? '')
  const [brand, setBrand] = useState(product.brand ?? '')
  const [colorway, setColorway] = useState(product.colorway ?? '')
  const [description, setDescription] = useState(product.description ?? '')
  const [price, setPrice] = useState(String(product.price))
  const [comparePrice, setComparePrice] = useState(
    product.comparePrice === null ? '' : String(product.comparePrice)
  )
  const [categoryId, setCategoryId] = useState(product.categoryId ?? '')
  const [gender, setGender] = useState<ProductGender>(product.gender)
  const [palette, setPalette] = useState<SneakerPalette>(product.palette)
  const [images, setImages] = useState(product.images)
  const [sizes, setSizes] = useState(product.sizes)

  function reload(source: EditableProduct) {
    setName(source.name)
    setSlug(source.slug)
    setSku(source.sku ?? '')
    setBrand(source.brand ?? '')
    setColorway(source.colorway ?? '')
    setDescription(source.description ?? '')
    setPrice(String(source.price))
    setComparePrice(source.comparePrice === null ? '' : String(source.comparePrice))
    setCategoryId(source.categoryId ?? '')
    setGender(source.gender)
    setPalette(source.palette)
    setImages(source.images)
    setSizes(source.sizes)
  }

  function updateSize(index: number, patch: Partial<{ size: number; stock: number }>) {
    setSizes((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await updateProductAction(product.id, {
        name,
        slug,
        sku,
        brand,
        colorway,
        description,
        images,
        price: Number(price),
        comparePrice: comparePrice.trim() === '' ? null : Number(comparePrice),
        categoryId: categoryId === '' ? null : categoryId,
        gender,
        palette,
        sizes: sizes.map((row) => ({
          size: Number(row.size),
          stock: Number(row.stock),
        })),
        featured: product.featured,
        active: product.active,
        isNewDrop: product.isNewDrop,
      })

      if (!result.ok) {
        setError(result.field)
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  const units = sizes.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          reload(product)
          setError(null)
          setOpen(true)
        }}
        aria-label={t('editProduct')}
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-[var(--q2m-line-soft)] text-[var(--q2m-ink-stone)] transition-colors hover:border-[var(--q2m-ink)] hover:text-[var(--q2m-ink)]"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 md:p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl space-y-6 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--q2m-ink)]">
              {t('editProduct')}
            </h3>
            <p className="mt-0.5 truncate text-xs text-[var(--q2m-ink-stone)]">
              {product.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('closeForm')}
            className="p-1.5 text-[var(--q2m-ink-stone)] transition-colors hover:text-[var(--q2m-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`edit-name-${product.id}`} className={labelClass}>
              {t('fieldName')}
            </label>
            <input
              id={`edit-name-${product.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={inputClass}
            />
            {error === 'name' && <p className={errorClass}>{t('errorName')}</p>}
          </div>

          <div>
            <label htmlFor={`edit-slug-${product.id}`} className={labelClass}>
              {t('fieldSlug')}
            </label>
            <input
              id={`edit-slug-${product.id}`}
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className={inputClass}
            />
            {(error === 'slug' || error === 'slugTaken') && (
              <p className={errorClass}>
                {error === 'slugTaken' ? t('errorSlugTaken') : t('errorSlug')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`edit-sku-${product.id}`} className={labelClass}>
              {t('fieldSku')}
            </label>
            <input
              id={`edit-sku-${product.id}`}
              value={sku}
              onChange={(event) => setSku(event.target.value.toUpperCase())}
              className={cn(inputClass, 'uppercase')}
            />
            {error === 'sku' && <p className={errorClass}>{t('errorSku')}</p>}
            {error === 'skuTaken' && (
              <p className={errorClass}>{t('errorSkuTaken')}</p>
            )}
          </div>

          <div>
            <label htmlFor={`edit-brand-${product.id}`} className={labelClass}>
              {t('fieldBrand')}
            </label>
            <input
              id={`edit-brand-${product.id}`}
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor={`edit-colorway-${product.id}`} className={labelClass}>
              {t('fieldColorway')}
            </label>
            <input
              id={`edit-colorway-${product.id}`}
              value={colorway}
              onChange={(event) => setColorway(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor={`edit-category-${product.id}`} className={labelClass}>
              {t('fieldCategory')}
            </label>
            <select
              id={`edit-category-${product.id}`}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
            >
              <option value="">{t('noCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`edit-gender-${product.id}`} className={labelClass}>
              {t('fieldGender')}
            </label>
            <select
              id={`edit-gender-${product.id}`}
              value={gender}
              onChange={(event) => setGender(event.target.value as ProductGender)}
              className={inputClass}
            >
              {GENDERS.map((option) => (
                <option key={option} value={option}>
                  {t(`gender_${option}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`edit-palette-${product.id}`} className={labelClass}>
              {t('fieldPalette')}
            </label>
            <select
              id={`edit-palette-${product.id}`}
              value={palette}
              onChange={(event) => setPalette(event.target.value as SneakerPalette)}
              className={inputClass}
            >
              {PALETTES.map((option) => (
                <option key={option} value={option}>
                  {t(`palette_${option}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`edit-price-${product.id}`} className={labelClass}>
              {t('fieldPrice')}
            </label>
            <input
              id={`edit-price-${product.id}`}
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
              className={inputClass}
            />
            {error === 'price' && <p className={errorClass}>{t('errorPrice')}</p>}
          </div>

          <div>
            <label htmlFor={`edit-compare-${product.id}`} className={labelClass}>
              {t('fieldComparePrice')}
            </label>
            <input
              id={`edit-compare-${product.id}`}
              type="number"
              min={0}
              step="0.01"
              value={comparePrice}
              onChange={(event) => setComparePrice(event.target.value)}
              className={inputClass}
            />
            {error === 'comparePrice' && (
              <p className={errorClass}>{t('errorComparePrice')}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor={`edit-description-${product.id}`} className={labelClass}>
              {t('fieldDescription')}
            </label>
            <textarea
              id={`edit-description-${product.id}`}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={cn(inputClass, 'resize-none')}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className={labelClass}>{t('fieldSizes')}</p>
            <button
              type="button"
              onClick={() =>
                setSizes((rows) => {
                  const last = rows[rows.length - 1]?.size ?? 40
                  return [...rows, { size: last + 1, stock: 1 }]
                })
              }
              className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--q2m-ink-mute)] transition-colors hover:text-[var(--q2m-accent-text)]"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('addSize')}
            </button>
          </div>

          <div className="space-y-2">
            {sizes.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={row.size}
                  onChange={(event) =>
                    updateSize(index, { size: Number(event.target.value) })
                  }
                  aria-label={t('fieldSize')}
                  className={cn(inputClass, 'w-28')}
                />
                <input
                  type="number"
                  min={0}
                  value={row.stock}
                  onChange={(event) =>
                    updateSize(index, { stock: Number(event.target.value) })
                  }
                  aria-label={t('fieldStock')}
                  className={cn(inputClass, 'w-28')}
                />
                <button
                  type="button"
                  onClick={() =>
                    setSizes((rows) => rows.filter((_, i) => i !== index))
                  }
                  disabled={sizes.length === 1}
                  aria-label={t('removeSize')}
                  className="rounded-sm border border-[var(--q2m-line-soft)] p-2 text-[var(--q2m-ink-stone)] transition-colors hover:text-[var(--q2m-ink)] disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-[var(--q2m-ink-stone)]">
            {t('totalUnits', { count: units })}
          </p>
          {error === 'sizes' && <p className={errorClass}>{t('errorSizes')}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className={labelClass}>{t('gallery')}</p>
            <span className="mb-2 text-xs text-[var(--q2m-ink-stone)]">
              {images.length}/{MAX_PRODUCT_IMAGES}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {images.map((image, index) => (
              <div
                key={image}
                className="relative h-20 w-20 overflow-hidden rounded-sm border border-[var(--q2m-line-soft)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="h-full w-full object-cover" />

                {index === 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-[var(--q2m-ink)] py-0.5 text-center text-[0.5625rem] uppercase tracking-[0.12em] text-[var(--q2m-bg-elevated)]">
                    {t('coverImage')}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setImages((rows) => rows.filter((_, i) => i !== index))
                  }
                  aria-label={t('removeImage')}
                  className="absolute right-1 top-1 rounded-sm bg-[var(--q2m-ink)]/80 p-1 text-[var(--q2m-bg-elevated)] transition-colors hover:bg-[var(--q2m-alert)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-[var(--q2m-ink-stone)]">
            {t('galleryHint')}
          </p>
        </div>

        {error && !['name', 'slug', 'slugTaken', 'sku', 'skuTaken', 'price', 'comparePrice', 'sizes'].includes(error) && (
          <p className="inline-flex items-center gap-2 text-sm text-[var(--q2m-alert)]">
            <AlertCircle className="h-4 w-4" />
            {t(`manageError_${error}`)}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--q2m-ink)] px-6 py-3 text-sm font-medium text-[var(--q2m-bg-elevated)] transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {pending ? t('saving') : t('save')}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-sm border border-[var(--q2m-line-strong)] px-5 py-3 text-sm font-medium text-[var(--q2m-ink-soft)] transition-colors hover:text-[var(--q2m-ink)]"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
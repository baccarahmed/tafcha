'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { AlertCircle, Check, Plus, Sparkles, X } from 'lucide-react'
import {
  analyzeProductImageAction,
  createProductAction,
} from '@/app/actions/products'
import { MAX_PRODUCT_IMAGES, cn, slugify } from '@/lib/utils'
import type { DbCategory } from '@/types/catalog'
import type { ProductGender, SneakerPalette } from '@/types/product'

const PALETTES: SneakerPalette[] = ['crimson', 'ember', 'void', 'volt', 'onyx']
const GENDERS: ProductGender[] = ['homme', 'femme', 'enfant', 'unisexe']

const inputClass =
  'q2m-input w-full px-3.5 py-2.5 text-sm text-[var(--q2m-ink)] placeholder:text-[var(--q2m-ink-stone)] outline-none'

const labelClass =
  'mb-2 block text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--q2m-ink-stone)]'

const errorClass = 'mt-1.5 text-xs text-[var(--q2m-alert)]'

interface SizeRow {
  size: number
  stock: number
}

interface PendingImage {
  base64: string
  mimeType: string
  /** URL locale pour l'apercu, revoqueee au reset ou au demontage. */
  preview: string
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Reduit la photo avant envoi : une image de smartphone fait plusieurs Mo et
 * Gemini n'a pas besoin de plus que 1024 px pour lire une silhouette.
 */
async function toCompressedBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file)

  const maxEdge = 1024
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponible')

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)

  return {
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mimeType: 'image/jpeg',
  }
}

export default function ProductForm({ categories }: { categories: DbCategory[] }) {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const locale = useLocale()

  const [formOpen, setFormOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [sku, setSku] = useState('')
  const [brand, setBrand] = useState('Q2M')
  const [colorway, setColorway] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [gender, setGender] = useState<ProductGender>('unisexe')
  const [palette, setPalette] = useState<SneakerPalette>('onyx')
  const [sizes, setSizes] = useState<SizeRow[]>([{ size: 42, stock: 1 }])
  const [featured, setFeatured] = useState(false)
  const [active, setActive] = useState(true)
  const [isNewDrop, setIsNewDrop] = useState(false)

  const [aiPending, setAiPending] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiFilled, setAiFilled] = useState(false)

  /**
   * Les photos restent en memoire jusqu'a la creation : l'upload n'a lieu
   * qu'une fois le slug valide, pour ne pas laisser de fichiers orphelins si
   * la fiche est rejetee. La premiere photo est la couverture.
   */
  const [images, setImages] = useState<PendingImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Chaque `createObjectURL` retient le fichier en memoire tant que l'URL n'est
   * pas revokee : on libere les precedentes a chaque depot et a la destruction
   * du composant.
   */
  const previewUrls = useRef<string[]>([])

  useEffect(() => {
    const urls = previewUrls.current

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function trackPreview(file: File): string {
    const url = URL.createObjectURL(file)

    previewUrls.current.push(url)

    return url
  }

  function forgetPreviews() {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrls.current = []
  }

  function reset() {
    setName('')
    setSlug('')
    setSlugTouched(false)
    setSku('')
    setBrand('Q2M')
    setColorway('')
    setDescription('')
    setPrice('')
    setComparePrice('')
    setCategoryId('')
    setGender('unisexe')
    setPalette('onyx')
    setSizes([{ size: 42, stock: 1 }])
    setFeatured(false)
    setActive(true)
    setIsNewDrop(false)
    setErrorField(null)
    setAiError(null)
    setAiFilled(false)
    forgetPreviews()
    setImages([])
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  function updateSize(index: number, patch: Partial<SizeRow>) {
    setSizes((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  /**
   * Chemin court : on depose une ou plusieurs photos, l'IA remplit les champs
   * qu'elle peut lire a partir de la premiere. Prix, stock et pointures
   * restent a la main : l'IA ne les invente pas.
   *
   * Deposer une deuxieme declenche une nouvelle lecture, ce qui est le cas
   * nominal pour creer une variante de couleur du meme modele.
   */
  async function handleFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter((file) => ACCEPTED.includes(file.type))

    if (accepted.length === 0) {
      setAiError('unsupported')
      return
    }

    const room = MAX_PRODUCT_IMAGES - images.length

    if (accepted.length > room) {
      setAiError('tooManyImages')
      return
    }

    setAiError(null)
    setAiPending(true)

    try {
      const compressed = await Promise.all(
        accepted.map(async (file) => {
          const data = await toCompressedBase64(file)

          return { ...data, preview: trackPreview(file) }
        })
      )

      const next = [...images, ...compressed]

      setImages(next)

      // L'IA ne lit que la couverture : une photo de detail n'apporte rien de
      // nouveau sur la fiche et coute un appel de plus.
      const result = await analyzeProductImageAction(compressed[0], locale)

      if (!result.ok) {
        setAiError(result.error)
        return
      }

      const { draft } = result

      setFormOpen(true)
      setName(draft.name)
      setSlug(slugify(draft.name))
      setSlugTouched(false)
      setSku(draft.sku)
      setBrand(draft.brand)
      setColorway(draft.colorway)
      setDescription(draft.description)
      setGender(draft.gender)
      setPalette(draft.palette)
      setAiFilled(true)

      if (categoryId === '' && categories.length === 1) {
        setCategoryId(categories[0].id)
      }
    } catch {
      setAiError('failed')
    } finally {
      setAiPending(false)
    }
  }

  function removeImage(index: number) {
    setImages((rows) => {
      const target = rows[index]

      if (target) URL.revokeObjectURL(target.preview)

      return rows.filter((_, i) => i !== index)
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorField(null)
    setSavedSlug(null)

    const compare = comparePrice.trim() === '' ? null : Number(comparePrice)

    startTransition(async () => {
      const result = await createProductAction({
        name,
        slug,
        sku,
        brand,
        description,
        colorway,
        images: [],
        price: Number(price),
        comparePrice: compare,
        categoryId: categoryId === '' ? null : categoryId,
        gender,
        palette,
        sizes: sizes.map((row) => ({
          size: Number(row.size),
          stock: Number(row.stock),
        })),
        featured,
        active,
        isNewDrop,
      },
      // `preview` est une URL locale : elle n'a pas sa place dans la charge utile.
      images.length > 0
        ? images.map(({ base64, mimeType }) => ({ base64, mimeType }))
        : undefined
      )

      if (!result.ok) {
        setErrorField(result.field)
        return
      }

      setSavedSlug(result.slug)
      reset()
      router.refresh()
    })
  }

  const units = sizes.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)

  return (
    <div className="rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bg-elevated)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--q2m-ink)]">
            {t('newProduct')}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--q2m-ink-stone)]">
            {t('newProductLead')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="inline-flex items-center gap-2 rounded-sm bg-[var(--q2m-ink)] px-5 py-2.5 text-sm font-medium text-[var(--q2m-bg-elevated)] transition-opacity hover:opacity-85"
        >
          {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {formOpen ? t('closeForm') : t('openForm')}
        </button>
      </div>

      {savedSlug && (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--q2m-status-open)]">
          <Check className="h-4 w-4" />
          {t('productCreated', { slug: savedSlug })}
        </p>
      )}

      <div className="mt-6 border-t border-[var(--q2m-line-soft)] pt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files)
            event.target.value = ''
          }}
        />

        <button
          type="button"
          disabled={aiPending || images.length >= MAX_PRODUCT_IMAGES}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            void handleFiles(event.dataTransfer.files)
          }}
          className="flex w-full items-center gap-4 rounded-sm border border-dashed border-[var(--q2m-line)] bg-[var(--q2m-bone)] p-5 text-start transition-colors hover:border-[var(--q2m-accent)] disabled:opacity-60"
        >
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[0].preview}
              alt=""
              className="h-16 w-16 shrink-0 rounded-sm object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm bg-[var(--q2m-bg-elevated)]">
              <Sparkles className="h-6 w-6 text-[var(--q2m-accent-text)]" />
            </span>
          )}

          <span className="min-w-0">
            <span className="block text-sm font-medium text-[var(--q2m-ink)]">
              {aiPending ? t('aiAnalyzing') : t('aiDrop')}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--q2m-ink-stone)]">
              {t('aiHint')}
            </span>
          </span>
        </button>

        {aiError && (
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--q2m-alert)]">
            <AlertCircle className="h-3.5 w-3.5" />
            {t(`aiError_${aiError}`)}
          </p>
        )}

        {images.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {images.map((image, index) => (
              <div
                key={image.preview}
                className="relative h-20 w-20 overflow-hidden rounded-sm border border-[var(--q2m-line-soft)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.preview} alt="" className="h-full w-full object-cover" />

                {index === 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-[var(--q2m-ink)] py-0.5 text-center text-[0.5625rem] uppercase tracking-[0.12em] text-[var(--q2m-bg-elevated)]">
                    {t('coverImage')}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label={t('removeImage')}
                  className="absolute right-1 top-1 rounded-sm bg-[var(--q2m-ink)]/80 p-1 text-[var(--q2m-bg-elevated)] transition-colors hover:bg-[var(--q2m-alert)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6 border-t border-[var(--q2m-line-soft)] pt-6">
          {aiFilled && (
          <p className="flex items-center gap-2 border-t border-[var(--q2m-line-soft)] pt-4 text-xs text-[var(--q2m-ink-stone)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--q2m-accent-text)]" />
            {t('aiFilledNote')}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="productName" className={labelClass}>
                {t('fieldName')}
              </label>
              <input
                id="productName"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                required
                className={inputClass}
              />
              {errorField === 'name' && (
                <p className={errorClass}>{t('errorName')}</p>
              )}
            </div>

            <div>
              <label htmlFor="productSlug" className={labelClass}>
                {t('fieldSlug')}
              </label>
              <input
                id="productSlug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  setSlug(event.target.value)
                }}
                placeholder="rive-court-white"
                className={inputClass}
              />
              {errorField === 'slug' && (
                <p className={errorClass}>{t('errorSlug')}</p>
              )}
              {errorField === 'slugTaken' && (
                <p className={errorClass}>{t('errorSlugTaken')}</p>
              )}
            </div>

            <div>
              <label htmlFor="productSku" className={labelClass}>
                {t('fieldSku')}
              </label>
              <input
                id="productSku"
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                placeholder="Q2M-BONE-014"
                className={cn(inputClass, 'uppercase')}
              />
              <p className="mt-1.5 text-xs text-[var(--q2m-ink-stone)]">
                {t('skuHint')}
              </p>
              {errorField === 'sku' && (
                <p className={errorClass}>{t('errorSku')}</p>
              )}
              {errorField === 'skuTaken' && (
                <p className={errorClass}>{t('errorSkuTaken')}</p>
              )}
            </div>

            <div>
              <label htmlFor="productBrand" className={labelClass}>
                {t('fieldBrand')}
              </label>
              <input
                id="productBrand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="productColorway" className={labelClass}>
                {t('fieldColorway')}
              </label>
              <input
                id="productColorway"
                value={colorway}
                onChange={(event) => setColorway(event.target.value)}
                placeholder="Bone / Off White"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="productCategory" className={labelClass}>
                {t('fieldCategory')}
              </label>
              <select
                id="productCategory"
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
              <label htmlFor="productGender" className={labelClass}>
                {t('fieldGender')}
              </label>
              <select
                id="productGender"
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
              <label htmlFor="productPalette" className={labelClass}>
                {t('fieldPalette')}
              </label>
              <select
                id="productPalette"
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
              <label htmlFor="productPrice" className={labelClass}>
                {t('fieldPrice')}
              </label>
              <input
                id="productPrice"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
                className={inputClass}
              />
              {errorField === 'price' && <p className={errorClass}>{t('errorPrice')}</p>}
            </div>

            <div>
              <label htmlFor="productComparePrice" className={labelClass}>
                {t('fieldComparePrice')}
              </label>
              <input
                id="productComparePrice"
                type="number"
                min={0}
                step="0.01"
                value={comparePrice}
                onChange={(event) => setComparePrice(event.target.value)}
                className={inputClass}
              />
              {errorField === 'comparePrice' && (
                <p className={errorClass}>{t('errorComparePrice')}</p>
              )}
            </div>

            {/*
              Le champ URL sert au cas du sans-IA. Des qu'une photo est
              deposee, elle est hebergee automatiquement et l'URL n'est plus
              saisie a la main.
            */}
            {images.length > 0 && (
              <p className="flex items-center gap-2 text-xs text-[var(--q2m-ink-stone)] sm:col-span-2">
                <Check className="h-3.5 w-3.5" />
                {t('imagesReady', { count: images.length })}
              </p>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="productDescription" className={labelClass}>
                {t('fieldDescription')}
              </label>
              <textarea
                id="productDescription"
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
                    className="rounded-sm border border-[var(--q2m-line-soft)] p-2 text-[var(--q2m-ink-stone)] transition-colors hover:border-[var(--q2m-line-strong)] hover:text-[var(--q2m-ink)] disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-2 text-xs text-[var(--q2m-ink-stone)]">
              {t('totalUnits', { count: units })}
            </p>
            {errorField === 'sizes' && <p className={errorClass}>{t('errorSizes')}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: t('toggleActive'), value: active, set: setActive },
              { label: t('toggleFeatured'), value: featured, set: setFeatured },
              { label: t('toggleNewDrop'), value: isNewDrop, set: setIsNewDrop },
            ].map((toggle) => (
              <label
                key={toggle.label}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bone)] p-4 transition-colors hover:border-[var(--q2m-line-strong)]"
              >
                <span className="text-sm font-medium text-[var(--q2m-ink)]">
                  {toggle.label}
                </span>
                <input
                  type="checkbox"
                  checked={toggle.value}
                  onChange={(event) => toggle.set(event.target.checked)}
                  className="h-4 w-4 shrink-0 accent-[var(--q2m-accent)]"
                />
              </label>
            ))}
          </div>

          {errorField === 'forbidden' && (
            <p className="inline-flex items-center gap-2 text-sm text-[var(--q2m-alert)]">
              <AlertCircle className="h-4 w-4" />
              {t('errorForbidden')}
            </p>
          )}

          {images.length > 0 && errorField === 'uploadFailed' && (
            <p className="inline-flex items-center gap-2 text-sm text-[var(--q2m-alert)]">
              <AlertCircle className="h-4 w-4" />
              {t('error_uploadFailed')}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-sm bg-[var(--q2m-ink)] px-6 py-3 text-sm font-medium text-[var(--q2m-bg-elevated)] transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {pending ? t('creating') : t('createProduct')}
          </button>
        </form>
      )}
    </div>
  )
}
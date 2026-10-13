'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, ImagePlus, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { updateProductAction } from '@/app/actions/admin'
import {
  deleteProductImageAction,
  uploadProductImageAction,
} from '@/app/actions/products'
import { MAX_PRODUCT_IMAGES, cn } from '@/lib/utils'
import { ACCEPTED_IMAGE_TYPES, toCompressedBase64 } from '@/lib/image-compress'
import type { ProductGender, SneakerPalette } from '@/types/product'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const PALETTES: SneakerPalette[] = ['crimson', 'ember', 'void', 'volt', 'onyx']
const GENDERS: ProductGender[] = ['homme', 'femme', 'enfant', 'unisexe']

const fieldClass = 'border-[var(--q2m-line-soft)] focus-visible:ring-transparent'

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
  releaseDate: string | null
  dropEndsAt: string | null
  parentId: string | null
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
  models,
}: {
  product: EditableProduct
  categories: { id: string; name: string }[]
  models: { id: string; name: string; colorway: string | null }[]
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
  const [parentId, setParentId] = useState(product.parentId ?? '')
  const [gender, setGender] = useState<ProductGender>(product.gender)
  const [palette, setPalette] = useState<SneakerPalette>(product.palette)
  const [images, setImages] = useState(product.images)
  const [sizes, setSizes] = useState(product.sizes)
  const [releaseDate, setReleaseDate] = useState(product.releaseDate ?? '')
  const [dropEndsAt, setDropEndsAt] = useState(product.dropEndsAt ?? '')

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * URL des visuels televerses pendant cette session d'edition, pas encore
   * rattaches a la fiche. Fermer sans enregistrer les rendrait orphelins : on
   * les retire alors du bucket. Les visuels deja en base, eux, sont purges par
   * `updateProduct` une fois l'ecriture confirmee.
   */
  const sessionUploads = useRef<Set<string>>(new Set())

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
    setParentId(source.parentId ?? '')
    setGender(source.gender)
    setPalette(source.palette)
    setImages(source.images)
    setSizes(source.sizes)
    setReleaseDate(source.releaseDate ?? '')
    setDropEndsAt(source.dropEndsAt ?? '')
  }

  function updateSize(index: number, patch: Partial<{ size: number; stock: number }>) {
    setSizes((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function handleOpenChange(next: boolean) {
    // Fermeture sans enregistrer : les uploads de la session n'existent que
    // dans le bucket, on les supprime pour ne pas laisser d'orphelins.
    if (!next && sessionUploads.current.size > 0) {
      const orphans = [...sessionUploads.current]
      sessionUploads.current.clear()

      void Promise.all(orphans.map((url) => deleteProductImageAction(url)))
    }

    setOpen(next)
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return

    const room = MAX_PRODUCT_IMAGES - images.length
    if (room <= 0) {
      setError('images')
      return
    }

    setUploading(true)
    setError(null)

    const next = [...images]

    for (const file of Array.from(fileList).slice(0, room)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('unsupported')
        continue
      }

      try {
        const compressed = await toCompressedBase64(file)
        const result = await uploadProductImageAction(product.id, compressed)

        if (result.ok) {
          next.push(result.url)
          sessionUploads.current.add(result.url)
        } else {
          setError(result.reason)
        }
      } catch {
        setError('uploadFailed')
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
    setImages(next)
    setUploading(false)
  }

  function handleRemoveImage(index: number) {
    const url = images[index]
    if (!url) return

    setImages((rows) => rows.filter((_, i) => i !== index))

    // Un visuel deja en base reste dans le bucket jusqu'a l'enregistrement (le
    // serveur purge alors le diff). Un visuel de la session n'existe que dans
    // le bucket : on le supprime tout de suite.
    if (sessionUploads.current.delete(url)) {
      void deleteProductImageAction(url)
    }
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
        parentId: parentId === '' ? null : parentId,
        gender,
        palette,
        sizes: sizes.map((row) => ({
          size: Number(row.size),
          stock: Number(row.stock),
        })),
        featured: product.featured,
        active: product.active,
        isNewDrop: product.isNewDrop,
        releaseDate: releaseDate ? releaseDate : null,
        dropEndsAt: dropEndsAt ? dropEndsAt : null,
      })

      if (!result.ok) {
        setError(result.field)
        return
      }

      // Les visuels de la session sont desormais en base : plus rien a purger.
      sessionUploads.current.clear()
      setOpen(false)
      router.refresh()
    })
  }

  const units = sizes.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)

  /**
   * Bandeau d'erreur generique. Les erreurs de champ sont deja rendues a cote de
   * leur input ; les raisons d'upload n'ont pas de cle `manageError_*` et
   * reutilisent les libelles du formulaire de creation.
   */
  function renderError() {
    if (!error) return null

    if (
      [
        'name',
        'slug',
        'slugTaken',
        'sku',
        'skuTaken',
        'price',
        'comparePrice',
        'sizes',
        'date',
        'parent',
        'parentNotFound',
        'parentNotRoot',
        'parentHasChildren',
      ].includes(error)
    )
      return null

    const uploadKey =
      error === 'unsupported'
        ? 'aiError_unsupported'
        : error === 'tooLarge'
          ? 'aiError_tooLarge'
          : error === 'uploadFailed'
            ? 'error_uploadFailed'
            : null

    return (
      <p className="inline-flex items-center gap-2 text-sm text-[var(--q2m-alert)]">
        <AlertCircle className="h-4 w-4" />
        {uploadKey ? t(uploadKey) : t(`manageError_${error}`)}
      </p>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Bouton d'edition */}
      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-7 w-7 text-[var(--q2m-ink-stone)]"
      >
        <button
          type="button"
          onClick={() => {
            reload(product)
            setError(null)
            setOpen(true)
          }}
          aria-label={t('editProduct')}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </Button>

      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editProduct')}</DialogTitle>
          <p className="truncate text-xs text-[var(--q2m-ink-stone)]">{product.name}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor={`edit-name-${product.id}`}>{t('fieldName')}</Label>
              <Input
                id={`edit-name-${product.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className={fieldClass}
              />
              {error === 'name' && <p className={errorClass}>{t('errorName')}</p>}
            </div>

            <div>
              <Label htmlFor={`edit-slug-${product.id}`}>{t('fieldSlug')}</Label>
              <Input
                id={`edit-slug-${product.id}`}
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                className={fieldClass}
              />
              {(error === 'slug' || error === 'slugTaken') && (
                <p className={errorClass}>
                  {error === 'slugTaken' ? t('errorSlugTaken') : t('errorSlug')}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor={`edit-sku-${product.id}`}>{t('fieldSku')}</Label>
              <Input
                id={`edit-sku-${product.id}`}
                value={sku}
                onChange={(event) => setSku(event.target.value.toUpperCase())}
                className={cn(fieldClass, 'uppercase')}
              />
              {error === 'sku' && <p className={errorClass}>{t('errorSku')}</p>}
              {error === 'skuTaken' && (
                <p className={errorClass}>{t('errorSkuTaken')}</p>
              )}
            </div>

            <div>
              <Label htmlFor={`edit-brand-${product.id}`}>{t('fieldBrand')}</Label>
              <Input
                id={`edit-brand-${product.id}`}
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <Label htmlFor={`edit-colorway-${product.id}`}>{t('fieldColorway')}</Label>
              <Input
                id={`edit-colorway-${product.id}`}
                value={colorway}
                onChange={(event) => setColorway(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <Label>{t('fieldCategory')}</Label>
              <Select
                value={categoryId || 'none'}
                onValueChange={(value) => setCategoryId(value === 'none' ? '' : value)}
              >
                <SelectTrigger className={cn('w-full', fieldClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('noCategory')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('fieldParentModel')}</Label>
              <Select
                value={parentId || 'none'}
                onValueChange={(value) => setParentId(value === 'none' ? '' : value)}
              >
                <SelectTrigger className={cn('w-full', fieldClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('parentNone')}</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.colorway ? `${model.name} · ${model.colorway}` : model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {['parent', 'parentNotFound', 'parentNotRoot', 'parentHasChildren'].includes(
                error ?? ''
              ) && <p className={errorClass}>{t(`manageError_${error}`)}</p>}
            </div>

            <div>
              <Label>{t('fieldGender')}</Label>
              <Select value={gender} onValueChange={(value) => setGender(value as ProductGender)}>
                <SelectTrigger className={cn('w-full', fieldClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`gender_${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('fieldPalette')}</Label>
              <Select
                value={palette}
                onValueChange={(value) => setPalette(value as SneakerPalette)}
              >
                <SelectTrigger className={cn('w-full', fieldClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PALETTES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`palette_${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor={`edit-price-${product.id}`}>{t('fieldPrice')}</Label>
              <Input
                id={`edit-price-${product.id}`}
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
                className={fieldClass}
              />
              {error === 'price' && <p className={errorClass}>{t('errorPrice')}</p>}
            </div>

            <div>
              <Label htmlFor={`edit-compare-${product.id}`}>{t('fieldComparePrice')}</Label>
              <Input
                id={`edit-compare-${product.id}`}
                type="number"
                min={0}
                step="0.01"
                value={comparePrice}
                onChange={(event) => setComparePrice(event.target.value)}
                className={fieldClass}
              />
              {error === 'comparePrice' && (
                <p className={errorClass}>{t('errorComparePrice')}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor={`edit-description-${product.id}`}>{t('fieldDescription')}</Label>
              <Textarea
                id={`edit-description-${product.id}`}
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={cn(fieldClass, 'resize-none')}
              />
            </div>

            <div>
              <Label htmlFor={`edit-release-${product.id}`}>{t('fieldReleaseDate')}</Label>
              <Input
                id={`edit-release-${product.id}`}
                type="date"
                value={releaseDate}
                onChange={(event) => setReleaseDate(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <Label htmlFor={`edit-ends-${product.id}`}>{t('fieldDropEndsAt')}</Label>
              <Input
                id={`edit-ends-${product.id}`}
                type="date"
                value={dropEndsAt}
                onChange={(event) => setDropEndsAt(event.target.value)}
                className={fieldClass}
              />
              {error === 'date' && <p className={errorClass}>{t('errorDate')}</p>}
            </div>
          </div>

          <p className="text-xs text-[var(--q2m-ink-stone)]">{t('dropDateHint')}</p>

          <div>
            <div className="flex items-center justify-between">
              <Label className="mb-2">{t('fieldSizes')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSizes((rows) => {
                    const last = rows[rows.length - 1]?.size ?? 40
                    return [...rows, { size: last + 1, stock: 1 }]
                  })
                }
                className="mb-2 text-xs text-[var(--q2m-ink-mute)]"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('addSize')}
              </Button>
            </div>

            <div className="space-y-2">
              {sizes.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={row.size}
                    onChange={(event) =>
                      updateSize(index, { size: Number(event.target.value) })
                    }
                    aria-label={t('fieldSize')}
                    className={cn(fieldClass, 'w-28')}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={row.stock}
                    onChange={(event) =>
                      updateSize(index, { stock: Number(event.target.value) })
                    }
                    aria-label={t('fieldStock')}
                    className={cn(fieldClass, 'w-28')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setSizes((rows) => rows.filter((_, i) => i !== index))
                    }
                    disabled={sizes.length === 1}
                    aria-label={t('removeSize')}
                    className="h-9 w-9 text-[var(--q2m-ink-stone)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
              <Label className="mb-2">{t('gallery')}</Label>
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
                    onClick={() => handleRemoveImage(index)}
                    aria-label={t('removeImage')}
                    className="absolute right-1 top-1 rounded-sm bg-[var(--q2m-ink)]/80 p-1 text-[var(--q2m-bg-elevated)] transition-colors hover:bg-[var(--q2m-alert)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />

            <div className="mt-3 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={pending || uploading || images.length >= MAX_PRODUCT_IMAGES}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {t('addImages')}
              </Button>
              <p className="text-xs text-[var(--q2m-ink-stone)]">{t('galleryHint')}</p>
            </div>
          </div>

          {renderError()}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              <Save className="h-4 w-4" />
              {pending ? t('saving') : t('save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
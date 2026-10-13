'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Check, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import {
  deleteGalleryImageAction,
  updateGalleryImages,
  uploadGalleryImageAction,
} from '@/app/actions/gallery'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Reduit la photo avant envoi : une image de smartphone fait plusieurs Mo, la
 * galerie n'en a pas besoin au-dela de 1600 px.
 */
async function toCompressedBase64(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file)

  const maxEdge = 1600
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas indisponible')

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

  return {
    base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mimeType: 'image/jpeg',
  }
}

export default function GalleryManager({ initial }: { initial: string[] }) {
  const t = useTranslations('dashboard')
  const [images, setImages] = useState<string[]>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function persist(next: string[]) {
    setImages(next)
    await updateGalleryImages(next)
    flashSaved()
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return

    setBusy(true)
    setError(null)

    const next = [...images]

    for (const file of Array.from(fileList)) {
      if (!ACCEPTED.includes(file.type)) {
        setError(t('galleryError_unsupported'))
        continue
      }

      try {
        const compressed = await toCompressedBase64(file)
        const result = await uploadGalleryImageAction(compressed)

        if (result.ok) next.push(result.url)
        else setError(t(`galleryError_${result.reason}`))
      } catch {
        setError(t('galleryError_uploadFailed'))
      }
    }

    if (inputRef.current) inputRef.current.value = ''

    await persist(next)
    setBusy(false)
  }

  function handleRemove(url: string) {
    const next = images.filter((item) => item !== url)

    startTransition(async () => {
      await persist(next)
      await deleteGalleryImageAction(url)
    })
  }

  return (
    <Card className="max-w-3xl border-[var(--q2m-line-soft)]">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-[var(--q2m-ink)]">
          {t('photoGallery')}
        </CardTitle>
        <p className="text-xs text-[var(--q2m-ink-stone)]">{t('photoGalleryHint')}</p>
      </CardHeader>

      <CardContent className="space-y-5">
        {images.length === 0 ? (
          <p className="rounded-sm border border-dashed border-[var(--q2m-line-strong)] py-12 text-center text-sm text-[var(--q2m-ink-stone)]">
            {t('galleryEmpty')}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((url) => (
              <li
                key={url}
                className="group relative aspect-[3/4] overflow-hidden rounded-sm border border-[var(--q2m-line-soft)] bg-[var(--q2m-bone)]"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  aria-label={t('removeImage')}
                  className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-sm bg-black/70 text-white opacity-0 transition-opacity duration-140 ease-q2m group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="gap-2 rounded-sm bg-[var(--q2m-ink)] text-[var(--q2m-bg-elevated)] hover:opacity-85"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {t('addImages')}
          </Button>

          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--q2m-status-open)]">
              <Check className="h-4 w-4" />
              {t('gallerySaved')}
            </span>
          )}
        </div>

        {error && <p className="text-xs text-[var(--q2m-alert)]">{error}</p>}
      </CardContent>
    </Card>
  )
}

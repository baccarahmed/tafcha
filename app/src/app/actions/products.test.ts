import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/session', () => ({ getSessionUser: vi.fn() }))
vi.mock('@/lib/admin-products', () => ({
  createProduct: vi.fn(),
  getProductSlug: vi.fn(),
  ProductValidationError: class ProductValidationError extends Error {
    constructor(public readonly field: string) {
      super(field)
    }
  },
}))
vi.mock('@/lib/admin-storage', () => ({
  uploadProductImage: vi.fn(),
  deleteProductImage: vi.fn(),
  storageKeyFromUrl: vi.fn(),
  ALLOWED_IMAGE_MIME: new Set(['image/jpeg', 'image/png', 'image/webp']),
  MAX_IMAGE_BYTES: 1_000,
  ImageUploadError: class ImageUploadError extends Error {
    constructor(public readonly reason: string) {
      super(reason)
    }
  },
}))
vi.mock('@/lib/gemini', () => ({
  analyzeProductImage: vi.fn(),
  AiConfigError: class AiConfigError extends Error {},
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

import { getSessionUser } from '@/lib/session'
import {
  createProduct,
  getProductSlug,
  ProductValidationError,
} from '@/lib/admin-products'
import {
  uploadProductImage,
  deleteProductImage,
  storageKeyFromUrl,
  ImageUploadError,
} from '@/lib/admin-storage'
import { analyzeProductImage, AiConfigError } from '@/lib/gemini'
import {
  analyzeProductImageAction,
  createProductAction,
  deleteProductImageAction,
  uploadProductImageAction,
} from '@/app/actions/products'

const admin = { id: 'u1', role: 'ADMIN' }

function baseInput() {
  return {
    name: 'Air Jordan 1',
    slug: 'air-jordan-1',
    sku: 'Q2M-BONE-014',
    brand: 'Q2M',
    description: 'desc',
    colorway: 'Bone',
    images: [],
    price: 249,
    comparePrice: null,
    categoryId: null,
    gender: 'unisexe' as const,
    palette: 'onyx' as const,
    sizes: [{ size: 42, stock: 1 }],
    featured: false,
    active: true,
    isNewDrop: false,
    parentId: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSessionUser).mockResolvedValue(admin as never)
})

describe('uploadProductImageAction', () => {
  it('refuse un visiteur non authentifie', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    expect(await uploadProductImageAction('p1', { base64: 'a', mimeType: 'image/jpeg' })).toEqual({
      ok: false,
      reason: 'forbidden',
    })
  })

  it('refuse un non-admin', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ id: 'u2', role: 'CLIENT' } as never)
    expect(await uploadProductImageAction('p1', { base64: 'a', mimeType: 'image/jpeg' })).toEqual({
      ok: false,
      reason: 'forbidden',
    })
  })

  it('renvoie notFound si la fiche a disparu', async () => {
    vi.mocked(getProductSlug).mockResolvedValue(null)
    expect(await uploadProductImageAction('p1', { base64: 'a', mimeType: 'image/jpeg' })).toEqual({
      ok: false,
      reason: 'notFound',
    })
  })

  it('televerse sous le slug courant', async () => {
    vi.mocked(getProductSlug).mockResolvedValue('air-jordan-1')
    vi.mocked(uploadProductImage).mockResolvedValue({ key: 'k', url: 'https://cdn.test/k' } as never)

    expect(await uploadProductImageAction('p1', { base64: 'a', mimeType: 'image/jpeg' })).toEqual({
      ok: true,
      url: 'https://cdn.test/k',
      key: 'k',
    })
    expect(uploadProductImage).toHaveBeenCalledWith({ base64: 'a', mimeType: 'image/jpeg' }, 'air-jordan-1')
  })

  it('propage le motif d\'un echec de televersement', async () => {
    vi.mocked(getProductSlug).mockResolvedValue('s')
    vi.mocked(uploadProductImage).mockRejectedValue(new ImageUploadError('unsupported'))

    expect(await uploadProductImageAction('p1', { base64: 'a', mimeType: 'image/jpeg' })).toEqual({
      ok: false,
      reason: 'unsupported',
    })
  })

  it('convertit une erreur inattendue en uploadFailed', async () => {
    vi.mocked(getProductSlug).mockResolvedValue('s')
    vi.mocked(uploadProductImage).mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await uploadProductImageAction('p1', { base64: 'a', mimeType: 'image/jpeg' })).toEqual({
      ok: false,
      reason: 'uploadFailed',
    })
  })
})

describe('deleteProductImageAction', () => {
  it('refuse un visiteur non authentifie', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    expect(await deleteProductImageAction('https://cdn.test/k')).toEqual({ ok: false })
  })

  it('refuse une URL non exploitable', async () => {
    vi.mocked(storageKeyFromUrl).mockReturnValue(null)
    expect(await deleteProductImageAction('pas-une-url')).toEqual({ ok: false })
    expect(deleteProductImage).not.toHaveBeenCalled()
  })

  it('supprime la cle derivee de l\'URL', async () => {
    vi.mocked(storageKeyFromUrl).mockReturnValue('products/k')
    vi.mocked(deleteProductImage).mockResolvedValue(undefined as never)

    expect(await deleteProductImageAction('https://cdn.test/k')).toEqual({ ok: true })
    expect(deleteProductImage).toHaveBeenCalledWith('products/k')
  })
})

describe('createProductAction', () => {
  it('refuse un non-admin', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    expect(await createProductAction(baseInput())).toEqual({ ok: false, field: 'forbidden' })
  })

  it('remonte le champ d\'une validation rejetee', async () => {
    vi.mocked(createProduct).mockRejectedValue(new ProductValidationError('price'))
    expect(await createProductAction(baseInput())).toEqual({ ok: false, field: 'price' })
  })

  it('cree la fiche sans images', async () => {
    vi.mocked(createProduct).mockResolvedValue({ id: 'p1', slug: 'air-jordan-1' } as never)

    expect(await createProductAction(baseInput())).toEqual({ ok: true, slug: 'air-jordan-1' })
    expect(uploadProductImage).not.toHaveBeenCalled()
    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ images: [] }))
  })

  it('televerse les visuels sous le slug avant creation', async () => {
    vi.mocked(uploadProductImage)
      .mockResolvedValueOnce({ key: 'k1', url: 'https://cdn.test/1' } as never)
      .mockResolvedValueOnce({ key: 'k2', url: 'https://cdn.test/2' } as never)
    vi.mocked(createProduct).mockResolvedValue({ id: 'p1', slug: 'air-jordan-1' } as never)

    const result = await createProductAction(baseInput(), [
      { base64: 'a', mimeType: 'image/jpeg' },
      { base64: 'b', mimeType: 'image/jpeg' },
    ])

    expect(result).toEqual({ ok: true, slug: 'air-jordan-1' })
    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ images: ['https://cdn.test/1', 'https://cdn.test/2'] }),
    )
  })

  it('retire les visuels televerses si la creation echoue', async () => {
    vi.mocked(uploadProductImage).mockResolvedValue({ key: 'k1', url: 'https://cdn.test/1' } as never)
    vi.mocked(createProduct).mockRejectedValue(new ProductValidationError('slug'))
    vi.mocked(deleteProductImage).mockResolvedValue(undefined as never)

    expect(
      await createProductAction(baseInput(), [{ base64: 'a', mimeType: 'image/jpeg' }]),
    ).toEqual({ ok: false, field: 'slug' })
    expect(deleteProductImage).toHaveBeenCalledWith('k1')
  })
})

describe('analyzeProductImageAction', () => {
  it('refuse un non-admin', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null)
    expect(await analyzeProductImageAction({ base64: 'a', mimeType: 'image/jpeg' }, 'fr')).toEqual({
      ok: false,
      error: 'forbidden',
    })
  })

  it('refuse un format non supporte', async () => {
    expect(await analyzeProductImageAction({ base64: 'a', mimeType: 'image/gif' }, 'fr')).toEqual({
      ok: false,
      error: 'unsupported',
    })
  })

  it('refuse une image trop lourde', async () => {
    const base64 = 'a'.repeat(2_000)
    expect(await analyzeProductImageAction({ base64, mimeType: 'image/jpeg' }, 'fr')).toEqual({
      ok: false,
      error: 'tooLarge',
    })
  })

  it('signale une cle IA absente', async () => {
    vi.mocked(analyzeProductImage).mockRejectedValue(new AiConfigError())
    expect(await analyzeProductImageAction({ base64: 'a', mimeType: 'image/jpeg' }, 'fr')).toEqual({
      ok: false,
      error: 'notConfigured',
    })
  })

  it('avale une panne du fournisseur', async () => {
    vi.mocked(analyzeProductImage).mockRejectedValue(new Error('500'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await analyzeProductImageAction({ base64: 'a', mimeType: 'image/jpeg' }, 'fr')).toEqual({
      ok: false,
      error: 'failed',
    })
  })

  it('renvoie le brouillon analyse', async () => {
    const draft = { name: 'Model', brand: 'Q2M', sku: 'Q2M-A-1', colorway: 'A', description: 'd', gender: 'unisexe', palette: 'onyx' } as const
    vi.mocked(analyzeProductImage).mockResolvedValue(draft as never)

    expect(await analyzeProductImageAction({ base64: 'a', mimeType: 'image/jpeg' }, 'fr')).toEqual({
      ok: true,
      draft,
    })
  })
})

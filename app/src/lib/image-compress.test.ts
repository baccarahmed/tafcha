// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACCEPTED_IMAGE_TYPES, toCompressedBase64 } from '@/lib/image-compress'

function mockCanvas() {
  const context = { drawImage: vi.fn() }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/jpeg;base64,QUJD',
  )
  return context
}

function capturedCanvas() {
  let canvas: HTMLCanvasElement | null = null
  const original = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const element = original(tag)
    if (tag === 'canvas') canvas = element as HTMLCanvasElement
    return element
  })
  return () => canvas
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ACCEPTED_IMAGE_TYPES', () => {
  it('liste les formats du bucket produit', () => {
    expect(ACCEPTED_IMAGE_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })
})

describe('toCompressedBase64', () => {
  it('reduit le plus grand cote et re-encode en JPEG', async () => {
    const context = mockCanvas()
    const canvas = capturedCanvas()
    const close = vi.fn()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 2000, height: 1000, close })),
    )

    const result = await toCompressedBase64(
      new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
      { maxEdge: 1024 },
    )

    expect(canvas()!.width).toBe(1024)
    expect(canvas()!.height).toBe(512)
    expect(context.drawImage).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
    expect(result).toEqual({ base64: 'QUJD', mimeType: 'image/jpeg' })
  })

  it('n\'agrandit jamais une petite image', async () => {
    mockCanvas()
    const canvas = capturedCanvas()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 100, height: 80, close: vi.fn() })),
    )

    await toCompressedBase64(new File(['x'], 'small.png', { type: 'image/png' }))

    expect(canvas()!.width).toBe(100)
    expect(canvas()!.height).toBe(80)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AiConfigError, analyzeProductImage, normalizeSku, toDraft } from '@/lib/gemini'

describe('normalizeSku', () => {
  it('majuscules, espaces en tirets', () => {
    expect(normalizeSku('q2m bone 014', 'Q2M')).toBe('Q2M-BONE-014')
  })

  it('retire les accents et la ponctuation', () => {
    expect(normalizeSku('Édition Été!!', 'Q2M')).toBe('EDITION-ETE')
  })

  it('compacte les tirets repetes et les bords', () => {
    expect(normalizeSku('--A--B--', 'Q2M')).toBe('A-B')
  })

  it('replie sur un prefixe de marque si trop court', () => {
    expect(normalizeSku('x', 'Nike')).toBe('NIKE')
  })

  it('replie sur Q2M si la marque est vide', () => {
    expect(normalizeSku('', '!!!')).toBe('Q2M')
  })

  it('ignore une valeur non-chaine', () => {
    expect(normalizeSku(42, 'Q2M')).toBe('Q2M')
  })

  it('plafonne a 40 caracteres', () => {
    expect(normalizeSku('A'.repeat(60), 'Q2M').length).toBe(40)
  })
})

describe('toDraft', () => {
  it('rejette une valeur non-objet', () => {
    expect(toDraft(null)).toBeNull()
    expect(toDraft('texte')).toBeNull()
  })

  it('rejette un nom trop court', () => {
    expect(toDraft({ name: 'A' })).toBeNull()
  })

  it('normalise une reponse complete', () => {
    const draft = toDraft({
      name: '  Phantom  ',
      brand: ' Jordan ',
      sku: 'aj1 black 014',
      colorway: ' Black ',
      description: '  desc  ',
      gender: 'homme',
      palette: 'void',
    })

    expect(draft).toEqual({
      name: 'Phantom',
      brand: 'Jordan',
      sku: 'AJ1-BLACK-014',
      colorway: 'Black',
      description: 'desc',
      gender: 'homme',
      palette: 'void',
    })
  })

  it('applique les replis pour genre, palette, colorway et marque', () => {
    const draft = toDraft({ name: 'Model X', sku: 'X-1' })

    expect(draft).toMatchObject({
      brand: 'Q2M',
      colorway: 'Standard',
      gender: 'unisexe',
      palette: 'onyx',
      description: '',
    })
  })

  it('ignore un genre ou une palette inconnus', () => {
    const draft = toDraft({ name: 'Model X', gender: 'robot', palette: 'rose' })
    expect(draft?.gender).toBe('unisexe')
    expect(draft?.palette).toBe('onyx')
  })
})

describe('analyzeProductImage', () => {
  const ORIGINAL_KEY = process.env.GEMINI_API_KEY
  const ORIGINAL_MODEL = process.env.GEMINI_MODEL

  const draftText = JSON.stringify({
    name: 'Model',
    brand: 'Q2M',
    sku: 'A-1',
    colorway: 'Bone',
    description: 'desc',
    gender: 'unisexe',
    palette: 'onyx',
  })

  const okBody = { candidates: [{ content: { parts: [{ text: draftText }] } }] }

  const jsonResponse = (body: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => body,
  })

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
    delete process.env.GEMINI_MODEL
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env.GEMINI_API_KEY = ORIGINAL_KEY
    process.env.GEMINI_MODEL = ORIGINAL_MODEL
  })

  it('leve AiConfigError sans cle', async () => {
    delete process.env.GEMINI_API_KEY
    await expect(
      analyzeProductImage({ base64: 'a', mimeType: 'image/jpeg' }, 'fr'),
    ).rejects.toBeInstanceOf(AiConfigError)
  })

  it('joint un signal de timeout a la requete', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(okBody))
    vi.stubGlobal('fetch', fetchMock)

    await analyzeProductImage({ base64: 'a', mimeType: 'image/jpeg' }, 'fr')

    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('bascule sur le modele suivant apres une panne reseau', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonResponse(okBody))
    vi.stubGlobal('fetch', fetchMock)

    const draft = await analyzeProductImage({ base64: 'a', mimeType: 'image/jpeg' }, 'fr')

    expect(draft.name).toBe('Model')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('bascule apres une reponse non-ok', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'high demand' } }, false, 503))
      .mockResolvedValueOnce(jsonResponse(okBody))
    vi.stubGlobal('fetch', fetchMock)

    const draft = await analyzeProductImage({ base64: 'a', mimeType: 'image/jpeg' }, 'fr')

    expect(draft.name).toBe('Model')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('echoue avec le dernier motif si tous les modeles tombent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    await expect(
      analyzeProductImage({ base64: 'a', mimeType: 'image/jpeg' }, 'fr'),
    ).rejects.toThrow(/gemini: fetch failed/)
  })
})

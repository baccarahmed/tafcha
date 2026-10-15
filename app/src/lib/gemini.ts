import 'server-only'

import type { ProductGender, SneakerPalette } from '@/types/product'

/**
 * Analyse d'une photo produit par IA.
 *
 * La cle reste cote serveur : le navigateur ne doit jamais voir la cle, sinon
 * elle est publiee dans le bundle et devient exploitable par n'importe qui.
 */

export interface ProductDraft {
  name: string
  brand: string
  /**
   * Reference proposee. L'IA n'a pas accès a l'etat de la base : c'est le
   * serveur qui garantit l'unicite en suffixant si la reference est deja
   * prise.
   */
  sku: string
  colorway: string
  description: string
  gender: ProductGender
  palette: SneakerPalette
}

const GENDERS: ProductDraft['gender'][] = ['homme', 'femme', 'enfant', 'unisexe']

const PALETTES: SneakerPalette[] = ['crimson', 'ember', 'void', 'volt', 'onyx']

export class AiConfigError extends Error {
  constructor() {
    super('GEMINI_API_KEY missing')
    this.name = 'AiConfigError'
  }
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: {
      type: 'STRING',
      description: 'Nom du produit en 2 a 4 mots, sans marque si elle est deja connue',
    },
    brand: { type: 'STRING', description: 'Marque lue sur la photo, sinon "Q2M"' },
    sku: {
      type: 'STRING',
      description:
        'Reference du modele, au format PREFIXE-COULEUR-NUMERO, ex "Q2M-BONE-014". Le prefixe reprend les initiales de la marque.',
    },
    colorway: {
      type: 'STRING',
      description: 'Couleurs dominantes vues sur la photo, en anglais, ex "Bone / Off White"',
    },
    description: {
      type: 'STRING',
      description: 'Description produit de 1 a 3 phrases, dans la langue du prompt',
    },
    gender: {
      type: 'STRING',
      enum: GENDERS,
      description: 'Cible portee si elle se deduit de la silhouette',
    },
    palette: {
      type: 'STRING',
      enum: PALETTES,
      description: 'Palette de marque la plus proche des couleurs vues',
    },
  },
  required: ['name', 'brand', 'sku', 'colorway', 'description', 'gender', 'palette'],
} as const

const PROMPT = `Tu es un chef produit pour une marque de sneakers haut de gamme.
Analyse la photo et remplis la fiche produit.

Regles :
- Base chaque champ uniquement sur ce qui est visible. N'invente ni prix, ni stock, ni pointure.
- La meme paire commercialisee en plusieurs couleurs donne des fiches distinctes : la reference doit differer par la couleur.
- Si un element est illisible, choisis une valeur prudente et neutre.
- La description decrit la silhouette, les matieres visibles et l'usage, sans superlatifs.
- Le genre doit reposer sur la silhouette du modele, jamais sur une speculation.
- Reponds uniquement en JSON.`

interface GeminiPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[]
  error?: { message: string }
}

/**
 * L'IA peut renvoyer une reference avec des espaces ou des accents. On la
 * normalise en majuscules compactes : c'est un code, pas un libelle.
 */
export function normalizeSku(value: unknown, brand: string): string {
  const raw = typeof value === 'string' ? value : ''

  const cleaned = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (cleaned.length >= 3) return cleaned.slice(0, 40)

  // Repli : la marque seule vaut mieux qu'une reference vide.
  const prefix = brand.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'Q2M'

  return prefix
}

/**
 * L'API Gemini rend un schema JSON quand on fixe `responseSchema` : on
 * n'obtient donc pas de JSON libre a parser, mais un objet deja type.
 */
export function toDraft(raw: unknown): ProductDraft | null {
  if (typeof raw !== 'object' || raw === null) return null

  const value = raw as Record<string, unknown>

  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (name.length < 2) return null

  const brand = typeof value.brand === 'string' && value.brand.trim() ? value.brand.trim() : 'Q2M'

  return {
    name,
    brand,
    sku: normalizeSku(value.sku, brand),
    colorway:
      typeof value.colorway === 'string' && value.colorway.trim() ? value.colorway.trim() : 'Standard',
    description: typeof value.description === 'string' ? value.description.trim() : '',
    gender: GENDERS.includes(value.gender as ProductGender)
      ? (value.gender as ProductGender)
      : 'unisexe',
    palette: PALETTES.includes(value.palette as SneakerPalette)
      ? (value.palette as SneakerPalette)
      : 'onyx',
  }
}

/**
 * Delai maximal d'une tentative.
 *
 * Le defaut d'undici est de 5 minutes : un socket muet (IPv6 blackhole, reseau
 * qui tombe) bloquerait l'action tout ce temps avant de remonter un
 * `HeadersTimeoutError`. On coupe court pour pouvoir tenter le modele suivant.
 */
const REQUEST_TIMEOUT_MS = 25_000

/**
 * Gemini renvoie 503 « high demand » de facon aleatoire sur les modeles les
 * plus demandes. Un seul appel echoue donc de maniere aleatoire : on tente les
 * modeles dans l'ordre et on garde la premiere reponse exploitable.
 *
 * Une panne reseau (timeout compris) est traitee comme un echec de ce modele
 * uniquement : sans ce `try`, un unique stall faisait echouer toute l'analyse
 * alors que les autres modeles etaient disponibles.
 */
async function request(
  apiKey: string,
  models: string[],
  image: { base64: string; mimeType: string },
  locale: string,
): Promise<GeminiResponse> {
  let lastError = 'aucun modele disponible'

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `${PROMPT}\nLangue de la description : ${locale}.` },
                  { inline_data: { mime_type: image.mimeType, data: image.base64 } },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: RESPONSE_SCHEMA,
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      )

      const body = (await response.json()) as GeminiResponse

      if (response.ok && body.candidates?.[0]?.content?.parts?.[0]?.text) {
        return body
      }

      lastError = body.error?.message ?? String(response.status)
    } catch (error) {
      // Timeout, DNS ou socket casse : on retient le motif et on passe au
      // modele suivant plutot que d'abandonner l'analyse.
      lastError = error instanceof Error ? error.message : String(error)
    }
  }

  throw new Error(`gemini: ${lastError}`)
}

export async function analyzeProductImage(
  image: { base64: string; mimeType: string },
  locale: string,
): Promise<ProductDraft> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new AiConfigError()

  const preferred = process.env.GEMINI_MODEL

  const models = [
    ...(preferred ? [preferred] : []),
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
  ].filter((model, index, all) => all.indexOf(model) === index)

  const body = await request(apiKey, models, image, locale)

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text

  const draft = toDraft(text ? JSON.parse(text) : null)

  if (!draft) throw new Error('gemini: reponse illisible')

  return draft
}
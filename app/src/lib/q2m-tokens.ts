/**
 * Design tokens for the Q2M Tunis storefront.
 * Source: Figma file SK4UUbfAY2TLGlPlC5LHxd — "Q2M — QUE DE LA MARQUE TUNIS"
 * Every value points at a CSS custom property defined in globals.css so the
 * light/dark switch works without touching a single component. Never hardcode
 * these colours in a component; use the semantic utilities (bg-surface,
 * text-ink, border-line…) or one of these tokens.
 */

export const Q2M = {
  brand: "Q2M",
  brandFull: "QUE DE LA MARQUE TUNIS",
  monogram: "Q2M",
  bg: "var(--q2m-bg)",
  bgElevated: "var(--q2m-bg-elevated)",
  bgDark: "var(--q2m-bg-dark)",
  ink: "var(--q2m-ink)",
  inkSoft: "var(--q2m-ink-soft)",
  inkMute: "var(--q2m-ink-mute)",
  inkStone: "var(--q2m-ink-stone)",
  line: "var(--q2m-line)",
  lineSoft: "var(--q2m-line-soft)",
  /** Border for interactive controls (inputs, selects); meets 3:1 in both themes. */
  lineStrong: "var(--q2m-line-strong)",
  accent: "var(--q2m-accent)",
  /** Gold safe to use as *text* on light surfaces. `accent` only reaches 2.1:1 there. */
  accentText: "var(--q2m-accent-text)",
  onAccent: "var(--q2m-on-accent)",
  alert: "var(--q2m-alert)",
  bone: "var(--q2m-bone)",
  boneSoft: "var(--q2m-bone-soft)",
  /** Text/icon colour for content sitting on an always-dark section (hero, footer, drops). */
  onDark: "var(--q2m-on-dark)",
  onDarkSoft: "var(--q2m-on-dark-soft)",
} as const;

export const Q2M_FONT = "'Inter', system-ui, sans-serif";

/**
 * Les libelles vivent dans `messages/*.json`, pas ici : une constante de
 * configuration ne peut pas porter le texte d'une autre langue. Chaque entree
 * expose la cle que le composant resout via `t()`.
 */

/**
 * Links point at real query params. Only slugs that exist in `categories` are
 * offered: a link to a missing category lands on an empty grid.
 *
 * `labelKey` est resolu dans le namespace `nav`.
 */
export const NAV_LINKS = [
  { labelKey: 'new', href: '/shop' },
  { labelKey: 'sneakers', href: '/shop?category=sneakers' },
  { labelKey: 'drops', href: '/drops' },
] as const;

/**
 * Gender entries are rendered only for genders actually present in the catalog,
 * so the header never links to an empty grid.
 *
 * La cle est derivée du genre : `gender_homme` dans le namespace `shop`.
 */
export const GENDER_NAV_LINKS = [
  { gender: 'homme' },
  { gender: 'femme' },
  { gender: 'enfant' },
  { gender: 'unisexe' },
] as const;

/** Bandeau de credo, resolu dans `home.manifesto`. */
export const MANIFESTO_KEYS = ['curated', 'limited', 'independent', 'shipping'] as const;

/**
 * Avantages boutique, resolus dans `home.benefits`.
 *
 * L'ordre suit la grille du Figma : authenticite, livraison, retours, conseil.
 */
export const BENEFIT_KEYS = ['authenticity', 'shipping', 'returns', 'studio'] as const;

/**
 * Assets visuels premium du brand Q2M — couronne or + argent + drapeau FR.
 *
 * L'emblème est dérivé d'un logo client carre sur fond noir puis normalisé en
 * un unique badge circulaire (`logoCircle`) : fond noir réduit, fin liseré or,
 * coins transparents. Le composant `Q2MLogo` est le seul point d'entrée, si
 * bien que navbar, footer, admin, login, favicon et image OG partagent le même
 * rendu. Voir `scripts/make-logo.mjs`.
 *
 * Les autres visuels (hero, catégories, drops) restent générés via le pipeline text_to_image.
 */
const IMG = (prompt: string, size: string) =>
  `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;

export const Q2M_BRAND_IMAGES = {
  /** Emblème circulaire unique — badge noir + liseré or, coins transparents.
   *  Sélectionné par `Q2MLogo`, utilisé partout (navbar, footer, admin, login,
   *  favicon, image OG). Généré par `scripts/make-logo.mjs`. */
  logoCircle: '/images/q2m/logo-q2m-circle.png',
  /** PNG transparent historique (non utilisé par l'UI, conservé en source). */
  logo: '/images/q2m/logo q2m.png',
  /** JPG sur fond noir — source de l'emblème circulaire. */
  logoOnBlack: '/images/q2m/logo q2m.jpg',
  /** Visuel client fourni (1254×1254) — poster du hero, la vidéo se superpose. */
  heroMain: '/images/q2m/Nike_TN_sneakers_on_display_2K_20261008145935.jpg',
  categoryHomme: IMG(
    'Mens luxury sneakers fashion editorial, handsome athletic north african man model, confident pose wearing premium black leather sneakers with gold logo details, dark modern minimal outfit, moody background with soft crimson rim lighting, high end fashion photography, portrait 4:3',
    'portrait_4_3',
  ),
  /** Visuel client — `Elevate Your Style with Minimalist Jeans Outfits.jpg`
   *  (736×1104), recadré en 4/5 par object-cover. */
  categoryFemme: '/images/q2m/category-femme.jpg',
  /** Visuel client — `Children's fashion ⬇️ Summer outfit.jpg` (736×1197),
   *  recadré en 4/5 par object-cover. */
  categoryEnfant: '/images/q2m/category-enfant.jpg',
  dropNightRun: IMG(
    'Midnight urban running campaign, dynamic low angle shot of black and red performance running sneakers in motion, wet reflective asphalt ground, dramatic crimson red and gold neon bokeh lights in background, motion blur on edges, cinematic Paris inspired night scene, luxury drop campaign',
    'landscape_16_9',
  ),
  dropClassic: IMG(
    'Luxury sneakers drop campaign still life, three premium sneakers arranged artistically on dark marble surface, gold crown logo engraved on heel tab, elegant lighting, small french flag detail, luxury Parisian boutique aesthetic, high end product photography',
    'landscape_16_9',
  ),
} as const;

/**
 * Assets vidéo locaux (`public/uploads/`) — hero fond animé.
 * MP4 H.264 : lisible partout (Chrome/Safari/Firefox/Edge + iOS via playsInline),
 * toujours diffusé en muted/loop, avec repli image statique si indisponible.
 */
export const Q2M_BRAND_VIDEOS = {
  /** Unboxing Nike TN — background du hero (3 Mo). */
  heroUnboxing: '/uploads/Unboxing_Nike_TN_sneakers_20261007152939.mp4',
} as const;
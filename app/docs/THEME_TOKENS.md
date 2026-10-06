# Theme Tokens — Q2M

Source de vérité : `src/app/globals.css` (variables CSS) et `src/lib/q2m-tokens.ts` (objets `Q2M`, `Q2M_FONT`, `Q2M_BRAND_IMAGES`).

Thème par défaut : **clair**. Le script inline de `src/app/[locale]/layout.tsx` applique `dark` sur `<html>` seulement si la préférence enregistrée (localStorage `q2m-theme`) vaut `dark` — sinon il reste en clair, y compris au premier chargement. `suppressHydrationWarning` sur `<html>` est requis : le script s'exécute avant le rendu.

## Variables CSS (`:root` = clair, `.dark` = sombre)

| Variable | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `--q2m-bg` | `#f6f4ef` | `#0a0a0a` | Fond global des pages |
| `--q2m-bg-elevated` | `#ffffff` | `#141414` | Cartes, panneaux, drawers, inputs |
| `--q2m-bg-dark` | `#090909` | `#050505` | Sections sombres (hero, footer) |
| `--q2m-ink` | `#000000` | `#f6f4ef` | Texte principal |
| `--q2m-ink-soft` | `#24211e` | `#d6d2c9` | Texte secondaire |
| `--q2m-ink-mute` | `#55514b` | `#aaa59c` | Labels, métadonnées |
| `--q2m-ink-stone` | `#64605a` | `#8a867e` | Texte atténué |
| `--q2m-line` | `#343434` | `#343434` | Filets décoratifs |
| `--q2m-line-soft` | `#d6d2c9` | `#1f1f1f` | Bordures légères |
| `--q2m-line-strong` | `#24211e` | `#6e6a64` | Bordures de contrôles (inputs, ≥3:1) |
| `--q2m-accent` | `#c9a45c` | `#c9a45c` | Or — surfaces, icônes, non pour le texte sur clair |
| `--q2m-accent-soft` | `#e2c891` | `#d8b670` | Or atténué (badges, hover) |
| `--q2m-accent-text` | `#6f4f1d` | `#c9a45c` | Or lisible comme **texte** sur clair |
| `--q2m-on-accent` | `#0f0f0f` | `#0a0a0a` | Texte posé sur `accent` |
| `--q2m-alert` | `#b3311a` | `#ff4d2e` | Erreurs, états d'alerte |
| `--q2m-bone` | `#e9e4da` | `#1a1a1a` | Surfaces crème (puces, chips) |
| `--q2m-bone-soft` | `#e4e0d8` | `#141414` | Variante crème plus douce |
| `--q2m-on-dark` | `#e9e4da` | `#e9e4da` | Texte sur section toujours sombre |
| `--q2m-on-dark-soft` | `#b8b3a9` | `#b8b3a9` | Texte secondaire sur section sombre |
| `--q2m-status-open` / `-bg` | vert | vert clair | Statut « disponible » |
| `--q2m-status-soon` / `-bg` | ambre | ambre clair | Statut « bientôt » |
| `--q2m-status-neutral` / `-bg` | gris | gris clair | Statut neutre |

## Règles d'usage

- Ne **jamais** coder une couleur en dur : utiliser `Q2M.*` en style inline, ou les utilitaires sémantiques (`text-ink`, `text-ink-mute`, `border-line-soft`, `bg-surface`…).
- `accent` (or) ne passe pas le contraste 3:1 comme texte sur fond clair → utiliser `accentText` / classe `text-accent` (qui pointe sur `--q2m-accent-text`).
- Sections toujours sombres (hero, footer, drawer) : textes en `onDark` / `onDarkSoft`, indépendantes du thème.
- Les surfaces panneau systématiques (drawer, récap commande, cartes) : `bgElevated` + bordure `lineStrong`.

## Logo

Deux fichiers, deux contextes :

- `Q2M_BRAND_IMAGES.logo` — `public/images/q2m/logo q2m.png` (460×471, fond transparent, traits sombres + or). Surfaces thématisées (login, dashboard…) : classe `.q2m-logo`, qui inverse le tracé en mode sombre (`filter` dans `globals.css`).
- `Q2M_BRAND_IMAGES.logoOnBlack` — `public/images/q2m/logo q2m.jpg` (1254×1254, marque sur fond noir). Chrome noir (navbar, footer, drawer) : le carré noir se fond dans le fond `#000000`, aucune classe de filtre requise.

Les deux sont des assets locaux (`public/images/q2m/`), jamais de hotlink.

## Typographie

- `Q2M_FONT = "'Inter', system-ui, sans-serif"` — corps de texte et pages (checkout, contact, account).
- Display du storefront : Space Grotesk / Syne (imports `@fontsource/*` dans `src/app/[locale]/layout.tsx`).

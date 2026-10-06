# Q2M — Que De La Marque Tunis

Boutique e-commerce de sneakers et streetwear premium (Tunisie). Front Next.js, backend InsForge, paiement à la livraison (COD).

## Stack

- **Next.js 15** (App Router, React 19, TypeScript strict)
- **next-intl** — `fr` (défaut), `ar` (RTL), `en` ; messages dans `messages/{fr,en,ar}.json`
- **Tailwind CSS 3** + composants shadcn/ui (`components/ui`)
- **InsForge** — Postgres, Auth, Storage, RLS (projet `nova-district`), voir `AGENTS.md`
- **Zustand** — panier persisté (localStorage), **framer-motion** — animations
- Devise **TND** (`formatCurrency` dans `src/lib/utils.ts`)

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés InsForge
npm run dev                  # http://localhost:3000/fr
```

Variables : `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`, `INSFORGE_API_KEY` (jamais de préfixe `NEXT_PUBLIC_`), `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY` / `GEMINI_MODEL` (optionnel).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de dev (port 3000) |
| `npm run build` | build de production |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | vérification de types |
| `npm run create-admin` | crée un compte admin (script `scripts/create-admin.mjs`) |
| `node scripts/audit-i18n.mjs` | vérifie la parité des clés i18n entre les 3 langues |

## Structure

```
src/
  app/
    [locale]/            # routes localisées
      (storefront)/      # vitrine : home, shop, product, drops, cart, checkout, login…
      (dashboard)/       # espace admin : produits, commandes, settings…
    api/                 # auth/refresh, contact, newsletter
    robots.ts, sitemap.ts
  actions/               # server actions (auth, orders, contact…)
  components/            # storefront/, dashboard/, ui/
  lib/                   # session, catalog, admin-settings, q2m-tokens, gemini…
  store/                 # panier (zustand)
  i18n/                  # routing, navigation (Link/redirect/useRouter localisés)
messages/                # fr.json, en.json, ar.json
migrations/              # migrations SQL InsForge
docs/THEME_TOKENS.md     # design tokens clair/sombre
public/images/q2m/       # logo et visuels de marque
```

## Thème

Clair par défaut, sombre au choix (localStorage `q2m-theme`), appliqué par un script inline dans `src/app/[locale]/layout.tsx`. Tokens : `docs/THEME_TOKENS.md`.

## Déploiement

Dockerfile Railway : `npm ci --legacy-peer-deps` → `npm run build` → `npm run start` (healthcheck `/`, config `railway.json`). Variables d'environnement à définir dans Railway.

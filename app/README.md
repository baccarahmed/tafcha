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

## Notifications

Deux niveau indépendants :

- **In-app (toujours actif)** — table `notifications` (migrations `20261017121000_notifications.sql`) + temps réel : cloche dans la navbar vitrine et la topbar admin, canal `user:<id>:notifications`, suivi de commande sur `order:<id>`.
- **Canaux externes (désactivés par défaut)** — `src/lib/notify-channels.ts`. Tant que `NOTIFY_CHANNELS_ENABLED !== 'true'`, aucun appel externe n'est émis (best-effort, une panne de canal ne fait jamais échouer une commande).

Variables des canaux externes (à définir dans `.env.local` **et** dans Vercel → Settings → Environment Variables) :

| Variable | Rôle |
| --- | --- |
| `NOTIFY_CHANNELS_ENABLED` | `true` pour activer l'envoi externe |
| `TELEGRAM_BOT_TOKEN` | token du bot (BotFather) |
| `TELEGRAM_CHAT_ID` | chat destinataire (le bot ne peut pas écrire le premier : envoyer `/start`) |
| `ADMIN_NOTIFICATION_EMAIL` | optionnel, destinataire des alertes e-mail |
| `INSFORGE_FROM_EMAIL` | optionnel, expéditeur (défaut `Q2M <no-reply@que2marque.com>`) |

### Bot Telegram (deux sens)

En plus des alertes sortantes, le bot répond aux administrateurs via un webhook
(`POST /api/telegram`, `src/app/api/telegram/route.ts`). Le routage vit dans
`src/lib/telegram-bot.ts`, la résolution des références dans
`src/lib/telegram-lookup.ts`, l'affichage dans `src/lib/telegram-format.ts` et
le registre d'actions dans `src/lib/telegram-actions.ts`.

**Accès** — allowlist de chats (`TELEGRAM_ALLOWED_CHAT_IDS`, sinon
`TELEGRAM_CHAT_ID`). Tout update venu d'un autre chat est refusé.

**Sécurité** — le webhook est signé : Telegram renvoie
`TELEGRAM_WEBHOOK_SECRET` dans le header `X-Telegram-Bot-Api-Secret-Token`
(`503` sans secret configuré, `403` si le header ne correspond pas), comparé
avant tout traitement.

**Confirmation** — toute écriture passe par `proposeAction` : la proposition est
persistée dans `telegram_actions` et un message de confirmation est envoyé avec
deux boutons (`run:<id>` / `drop:<id>`). Le `callback_data` ne porte que l'id,
car Telegram le limite à 64 octets ; la même table sert de journal d'audit,
consultable avec `/actions`. Les actions destructrices demandent une **seconde**
confirmation (`run2:<id>`), et une proposition non confirmée expire au bout de
30 minutes.

Le bot ne construit jamais de SQL : chaque commande devient une action nommée et
un payload validé, exécutés par les **mêmes fonctions** que le dashboard
(`updateOrder`, `updateProduct`, `duplicateProduct`, `deleteProduct`,
`setUserRole`/`demoteUser`, `createPromotion`/`updatePromotion`/
`setPromotionActive`/`deletePromotion`, `saveSiteSettings`), suivies de
`revalidateCatalog()`.

| Commande | Effet |
| --- | --- |
| `/help` | aide complète |
| `/orders [n]`, `/order #REF` | dernières commandes, détail d'une commande |
| `/stats [today\|week\|month]`, `/stock [seuil]` | ventes, stock faible |
| `/products [terme]`, `/product REF` | recherche et fiche produit |
| `/customers [terme]`, `/promos`, `/settings` | clients, promotions, réglages |
| `/actions [n]` | journal des actions du bot |
| `/ship`, `/deliver`, `/cancel`, `/setstatus`, `/setpayment`, `/note`, `/delivery` | suivi d'une commande |
| `/setstock`, `/addstock`, `/setprice`, `/activate`, `/deactivate`, `/feature`, `/newdrop`, `/duplicate` | produit et stock |
| `/promote`, `/demote` | rôle d'un compte |
| `/promo_on`, `/promo_off`, `/promo_new`, `/promo_target` | promotions |
| `/announce`, `/maintenance`, `/shipping`, `/freeship`, `/set` | vitrine |

Actions destructrices (double confirmation) : `/delproduct`, `/demote`,
`/promo_del`.

| Variable | Rôle |
| --- | --- |
| `TELEGRAM_WEBHOOK_SECRET` | secret signant le webhook (obligatoire pour que le bot réponde) |
| `TELEGRAM_ALLOWED_CHAT_IDS` | optionnel : plusieurs chats autorisés, séparés par des virgules |

Après un changement de domaine ou de secret, réenregistrer le webhook :

```bash
node scripts/telegram-webhook.mjs https://que2marque.vercel.app
```

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de dev (port 3000) |
| `npm run build` | build de production |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | vérification de types |
| `npm run create-admin` | crée un compte admin (script `scripts/create-admin.mjs`) |
| `node scripts/audit-i18n.mjs` | vérifie la parité des clés i18n entre les 3 langues |
| `node scripts/telegram-webhook.mjs [url]` | (ré)enregistre le webhook et le menu du bot Telegram |

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

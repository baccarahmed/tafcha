# Commandes de scan — audit Q2M

> **AVERTISSEMENT / RÈGLES D'ENGAGEMENT (§2 du plan)**
> - **Cible = staging uniquement** pour tout test actif (ZAP, ffuf, sqlmap, Burp Intruder).
>   Sur Vercel, utilisez une **preview deployment** (URL `tafcha-git-<branche>-evolutioncom.vercel.app`)
>   ou un déploiement de branche dédié, **jamais** `https://que2marque.vercel.com` (prod).
> - **Pas de DoS ni de test de charge** sans accord écrit de l'hébergeur et hors heures de pointe.
> - **Aucune donnée réelle de client** sur le staging (fait : comptes fictifs — voir § Base de staging).
> - Journalisez chaque commande : date, cible, outil.
> - **Sauvegarde** de la base avant toute phase destructive.
>
> **Adapter la cible** : définissez une fois pour toutes
> `export T=<URL-STAGING>` (ex. `export T=https://tafcha-git-fix-securite-evolutioncom.vercel.app`).

---

## Base de staging (backend de test isolé)

> **Projet InsForge séparé** : `q2m-staging` (appkey `g4x6iwmj`,
> `https://g4x6iwmj.us-east.insforge.app`). La prod reste `nova-district`
> (`47eeq5ju`) — les deux sont dans la même organisation InsForge.

- **Schéma** : historique complet des 37 migrations appliqué sur une base
  fraîche ; config alignée sur la prod (`require_email_verification = false`).
- **Seed (rejouable, garde-fou prod intégré)** :
  ```bash
  node scripts/seed-staging.mjs     # refuse 47eeq5ju / .env.local sans --allow-prod
  ```

  | Compte de test | Rôle | Mot de passe |
  |----------------|------|--------------|
  | `seed.client-a@q2m.test` | CUSTOMER | `Seed-Q2m-2026!` |
  | `seed.client-b@q2m.test` | CUSTOMER | `Seed-Q2m-2026!` |
  | `seed.admin@q2m.test`    | ADMIN    | `Seed-Q2m-2026!` |

  Recrée 4 commandes factices (PENDING / SHIPPED / DELIVERED / CANCELLED,
  dont une invitee) rattachees aux produits du catalogue de depart.
- **Credentials** : `.env.staging.local` (ignore par git via `.env*.local`).
- **CLI InsForge** : lancer `npx -y @insforge/cli current --json` AVANT toute
  commande `db` pour verifier le projet lie — une migration lancee avec le
  lien de prod par erreur (ou l'inverse) est le principal risque de cette
  config a deux bases.

### Cible frontend : preview Vercel isole

Les variables InsForge du scope **Preview** de Vercel pointent sur
`q2m-staging` (lignes `Preview` separees) ; `Production, Development`
restent sur la prod. Un deploiement de preview (`npx vercel`, sans `--prod`,
depuis une branche de scan) est donc **isole de la prod par construction**.

```bash
# Verification AVANT tout test actif :
npx vercel env ls | grep -E 'INSFORGE_URL'   # 2 lignes : "Preview" et "Production, Development"
npx vercel env pull /tmp/p.txt --environment=production
grep INSFORGE_URL /tmp/p.txt                 # host attendu : 47eeq5ju (prod)
```

> **Piege Vercel** : `vercel env update <nom> preview` ecrase la valeur de la
> ligne **multi-environnements entiere** (toutes les cibles) — cela peut
> basculer la prod sur le staging. La procedure sure est
> `vercel env remove <nom> preview` puis `vercel env add <nom> preview`
> (valeur via stdin) : une ligne `Preview` distincte est creee sans toucher a
> `Production/Development`. `vercel env ls` doit montrer **deux lignes** par
> variable InsForge apres le decoupage.

Un preview ne recoit que les variables InsForge + Gemini + le webhook secret :
pas de `TELEGRAM_*`, pas de cles VAPID, pas de `NOTIFY_CHANNELS_ENABLED` →
**canaux externes inactifs par defaut** (exigence de l'audit).

---

## Adaptation importante à votre stack

| Composant | Propriétaire | Conséquence pour le scan |
|-----------|--------------|--------------------------|
| Front / API | Next.js sur **Vercel** (serverless partagé) | Pas de scan de ports utile : infra mutualisée. Seul le **front public** est testable. |
| Base de données | **InsForge** (managé) | Non exposée publiquement par design. Vérifiez via RLS, pas via Nmap. |
| Storage | **InsForge Storage** (CDN signé) | Vérifier buckets/ACL par config, pas par scan réseau. |
| TLS / CDN | **Vercel** | Configuration TLS gérée ; on valide les **en-têtes** et le classement SSL Labs. |

> Donc : le scan « infrastructure » se réduit au **front public + configuration TLS + en-têtes**.
> Les volets **SAST / dépendances / secrets / logique métier** deviennent le cœur de la valeur.

---

## Phase 1 — Reconnaissance & cartographie (passif)

```bash
# Sous-domaines (peu utile ici — domaine unique — mais à documenter)
subfinder -d que2marque.vercel.app -silent
amass enum -passive -d que2marque.vercel.app

# Énumération de chemins exposés (fichiers .env, .git, backups, swagger)
echo "$T" > /tmp/paths.txt
ffuf -u "$T/FUZZ" -w /usr/share/seclists/Discovery/Web-Content/common.txt \
  -mc 200,204,301,302,307,401,403 -fc 404 -t 40 -rate 20

# Fichiers sensibles qui ne doivent JAMAIS être servis
for p in .env .env.local .git/config .git/HEAD backup.zip swagger.json \
  openapi.json package-lock.json robots.txt sitemap.xml; do
  printf '%-24s ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "$T/$p"
done
```

**Attendu** : `.env`, `.git/*`, `backup.zip`, `swagger.json` → **404**. `package-lock.json` expose les versions (info, acceptable).

## Phase 2 — Analyse automatisée de code (SAST, dépendances, secrets)

```bash
cd tafcha/app

# Dépendances connues vulnérables (VULN-005 corrigée : next@16 + sharp@0.35.
# Reste 9 vulns résiduelles dev/build-only — chaîne tailwindcss@3 / eslint)
npm audit --omit=dev

# Secrets dans l'historique Git (jamais de clés commitées)
npx gitleaks detect --source . -v

# SAST : OWASP Top 10 + Node.js
npx semgrep --config=p/nodejs --config=p/owasp-top-ten --config=p/react . 

# Dépendances obsolètes / non maintenues
npx retire .
```

**Action** : classer chaque alerte (vraie / faux positif) — voir rapport §VULN-005.

## Phase 3 — TLS & en-têtes (passif, prod autorisé)

```bash
# Classement TLS (note cible : A ou A+)
# Via https://www.ssllabs.com/ssltest/analyze.html?d=que2marque.vercel.app

# En-têtes de sécurité sur la prod (lecture seule, sans risque)
curl -sI https://que2marque.vercel.app | grep -iE \
  'content-security-policy|strict-transport|x-content-type|x-frame|referrer|permissions-policy|cross-origin-opener'

# Vérif HSTS + redirect HTTP→HTTPS
curl -sI http://que2marque.vercel.app | grep -iE 'location|strict-transport'

# Observatory (Mozilla) — score global
# https://observatory.mozilla.org/analyze/que2marque.vercel.app
```

**Attendu (déjà présent en code)** : CSP, HSTS `includeSubDomains; preload`, `nosniff`,
`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP. Vérifier qu'ils sont
bien servis en prod (le `headers()` de `next.config.mjs` s'applique à `/:path*`).

## Phase 4 — Tests applicatifs manuels (staging, actif)

> Utilisez **Burp Suite** (proxy) ou **ZAP**. Interceptez, modifiez, rejouez.

### 4.1 Contrôle d'accès / IDOR (priorité max)
```bash
# Depuis le code : chaque action utilise getSessionUser() + role==='ADMIN'.
# Test manuel : avec le cookie du CLIENT A, tentez d'accéder aux ressources du CLIENT B.

# A. Récupérez le cookie d'un client A connecté (via Burp).
# B. Liste des commandes A : noter l'orderId.
# C. Rejouez en remplaçant l'orderId par celui d'un client B :
#    (les Server Actions Next.js acceptent POST sur la page — rejouez le body exact)
#    Vérifiez : doit renvoyer 404 / accès refusé, JAMAIS les données de B.

# Test d'élévation : avec un compte CUSTOMER, appelez une action admin
# (ex. updateOrderAction) → doit renvoyer 'forbidden'.
```
**Repérer** : toute route/ action qui ne vérifie pas l'appartenance de la ressource.

### 4.2 Authentification / brute-force
```bash
# Le throttle est en mémoire (faible sur serverless) — test de contournement :
# envoyez 30 logins en parallèle vers le staging et observez si tous sont traités.
# (Rappel : ne pas DoS. 30 requêtes max, fenêtre courte.)
seq 1 30 | xargs -P 10 -I{} curl -s -X POST "$T/fr/login" \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data 'email=victime@example.com&password=essai{}' -o /dev/null -w '%{http_code}\n' | sort | uniq -c
```
**Attendu** : après ~5 essais, réponses génériques / ralenties. Voir VULN-002.

### 4.3 Injection (Postgres/RLS via InsForge)
```bash
# La requête part du client browser (clé anon) → testable via l'API PostgREST d'InsForge.
# Base STAGING : https://g4x6iwmj.us-east.insforge.app (clé anon dans
# .env.staging.local). NE JAMAIS rejouer ces tests contre 47eeq5ju (prod).

# Toute erreur SQL 500 / détail Postgres dans la réponse = fuite d'info.
# Chercher les filtres non typés côté serveur (`.eq(userInput)` sans String()).

# Avis : tentez d'insérer un avis sans achat via l'API directe (doit être bloqué par RLS
# reviews_insert_own qui exige payment_status='PAID').
```

### 4.4 Logique métier (paiement à la livraison = risque principal)
```bash
# Prix : le navigateur n'envoie AUCUN prix (recalculé serveur) — vérifiez en interceptant
# le POST de commande : pas de champ 'price'/'total' client. ✓ attendu.

# Quantités : testez -1, 0, 1.5, 9999, "abc" → tous rejetés (entier 1-99). 

# Race condition stock : deux commandes simultanées du même produit à stock=1
# (via Burp Repeater, en-tête "Parallel") → une seule doit réussir (FOR UPDATE).

# Coupon/promo : réutilisation en parallèle → une seule utilisation.

# Statut commande : un client tente de passer sa commande à "PAYÉE"/"EXPÉDIÉE"
# via updateOrderAction → 'forbidden'.
```

### 4.5 Mass assignment
```bash
# Dans les créations (avis, commande, inscription), ajoutez des champs non prévus :
#   role=ADMIN, isAdmin=true, price=0, status="PAID", user_id=<autre>
# → doivent être ignorés (les actions lisent des champs explicites, pas req.body entier).
```

### 4.6 XSS stocké / réfléchi
```bash
# Champs à tester avec la charge : <script>alert(1)</script>, <img src=x onerror=alert(1)>
#   - avis (comment, 600 car)  - nom, prénom, adresse, notes de commande  - champ recherche
# Vérifier le rendu : échappement React par défaut. Le JSON-LD est désormais échappé (VULN-004).
#   curl -s "$T/fr/product/<slug>" | grep -i '\\u003c'   # confirme l'échappement actif
```

### 4.7 Fichiers / SSRF / redirection
```bash
# Upload (back-office admin) : tentez un .php/.svg avec fausse extension, puis ../../nNom
# Open redirect : /fr/login?next=//evil.com et ?next=/\evil.com → doivent être neutralisés
#   (safeReturnPath le bloque — test de non-régression).
```

## Phase 5 — Journalisation & conformité (revue, pas de scan)

```bash
# Vérifier dans les logs (Vercel / InsForge) qu'aucun mot de passe ni token n'apparaît.
# Vérifier la présence d'alertes sur pic d'échecs de connexion.
# RGPD : registre des traitements, base légale (exécution du contrat), durées de
#   conservation, droit d'accès/effacement, procédure de notification < 72 h.
```

---

## Check-list de non-régression après correctifs

```bash
cd tafcha/app
npx tsc --noEmit
npm run lint
npm test
npm run build

# VULN-004 (JSON-LD échappé) :
curl -s "$T/fr/" | grep -c 'application/ld+json'      # > 0
#   dans la source, un nom produit doit être sérialisé avec \u003c s'il contient '<'

# VULN-003 (inscription générique) :
#   POST /register avec un e-mail déjà existant → même code 'invalid' qu'un autre échec
```

## Ce que ce scan NE couvre pas (à traiter hors de ces commandes)

- **VULN-001 (MFA admin)** : corrigé et déployé (TOTP + gate dashboard) — à re-tester sur staging (activation, désactivation, rate-limit du code).
- **VULN-002 (rate-limit partagé)** : corrigé et déployé (RPC `rate_limit_hit`, fallback mémoire) — re-tester §4.2.
- **VULN-005 (next@16 / sharp)** : corrigé et déployé — 9 vulns résiduelles = chaîne dev/build `tailwindcss@3`/eslint (fix major cassants, aucun runtime déployé, risque accepté).
- **Tests de charge / DoS** : exclus, accord hébergeur requis.

/**
 * Seed de test STAGING Q2M.
 *
 * Cree des donnees FICTIVES sur la base de staging (projet InsForge
 * « q2m-staging », appkey g4x6iwmj) pour les scans actifs decrits dans
 * SECURITY-SCAN.md :
 *   - 3 comptes : seed.client-a@q2m.test et seed.client-b@q2m.test (clients),
 *     seed.admin@q2m.test (ADMIN, pour les tests du back-office) ;
 *   - 4 commandes factices couvrant les statuts PENDING / SHIPPED /
 *     DELIVERED / CANCELLED, rattachees aux produits du catalogue de depart.
 *
 * Rejouable : les comptes existants sont reutilises (signIn), les commandes
 * des comptes de seed et la commande invitee (marquee SEED-GUEST) sont
 * supprimees puis recreees a chaque execution.
 *
 * GARDE-FOU : refuse la base de production (47eeq5ju.us-east.insforge.app,
 * ou l'URL portee par .env.local) sans le flag --allow-prod.
 *
 *   node scripts/seed-staging.mjs
 *   node scripts/seed-staging.mjs --env-file .env.staging.local
 *
 * Le mot de passe est unique au staging et figure dans SECURITY-SCAN.md :
 * il ne protege rien de precieux et sert aux tests de connexion.
 */
import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@insforge/sdk';

const PROD_APPKEY = '47eeq5ju';
const PASSWORD = 'Seed-Q2m-2026!';
const SEED_CITY = 'Seed-Staging'; // marqueur des commandes factices
const GUEST_PAYMENT_MARKER = 'SEED-GUEST';

const ACCOUNTS = [
  { email: 'seed.client-a@q2m.test', first_name: 'Seed', last_name: 'ClientA', admin: false },
  { email: 'seed.client-b@q2m.test', first_name: 'Seed', last_name: 'ClientB', admin: false },
  { email: 'seed.admin@q2m.test', first_name: 'Seed', last_name: 'Admin', admin: true },
];

// --- arguments ---------------------------------------------------------------

const args = process.argv.slice(2);
const allowProd = args.includes('--allow-prod');
const envFlag = args.indexOf('--env-file');
const envFile = envFlag >= 0 && args[envFlag + 1] ? args[envFlag + 1] : '.env.staging.local';

function fail(message, detail) {
  console.error(`ERREUR : ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

// --- chargement de l'environnement cible -------------------------------------

const envPath = new URL(`../${envFile}`, import.meta.url);
if (!existsSync(envPath)) {
  fail(
    `fichier d'environnement introuvable : ${envFile}`,
    'Preparez le staging (projet q2m-staging + .env.staging.local) avant de lancer le seed.',
  );
}

for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const baseUrl = (process.env.INSFORGE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  fail(`INSFORGE_URL / INSFORGE_API_KEY absents de ${envFile}`);
}

// --- garde-fou production -----------------------------------------------------
// Deux signaux : l'appkey connue de la prod, et l'URL que l'appli utilise
// vraiment (.env.local) — meme si un jour la prod change de nom de domaine.
let prodUrl = '';
const localEnv = new URL('../.env.local', import.meta.url);
if (existsSync(localEnv)) {
  for (const line of readFileSync(localEnv, 'utf8').split(/\r?\n/)) {
    const m = /^\s*INSFORGE_URL\s*=\s*(.*)\s*$/.exec(line);
    if (m) prodUrl = m[1].replace(/\/+$/, '');
  }
}

const isProd =
  new URL(baseUrl).hostname.startsWith(`${PROD_APPKEY}.`) ||
  (prodUrl !== '' && baseUrl === prodUrl);

if (isProd && !allowProd) {
  fail(
    `la cible est la base de PRODUCTION (${baseUrl}) — seed refuse.`,
    'Le seed ecrit des comptes et des commandes de test : il ne doit jamais toucher la prod.\n' +
      'Si vous savez absolument ce que vous faites : node scripts/seed-staging.mjs --allow-prod',
  );
}

// --- clients SDK -------------------------------------------------------------
// Un client « root » qui ne JAMAIS signer (resterait admin), et un client
// jetable pour recuperer les uuid via signIn quand le compte existe deja :
// signInWithPassword remplace le token du client par celui de l'utilisateur,
// qui n'a aucun droit d'ecriture sur profiles (cf. create-admin.mjs).
const root = () => createAdminClient({ baseUrl, apiKey });

async function uuidByEmail(email) {
  const probe = createAdminClient({ baseUrl, apiKey });
  const { data, error } = await probe.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data?.user?.id) {
    return { error: error?.message ?? 'compte inaccessible' };
  }
  return { id: data.user.id };
}

// --- comptes ------------------------------------------------------------------

async function ensureAccount(account) {
  const admin = root();
  const { data: created, error } = await admin.auth.signUp({
    email: account.email,
    password: PASSWORD,
  });

  let userId = created?.user?.id;

  if (error) {
    if (!/exist|already|taken|duplicate/i.test(error.message ?? '')) {
      fail(`creation de ${account.email} : ${error.message}`);
    }
    const existing = await uuidByEmail(account.email);
    if (existing.error) {
      fail(
        `${account.email} existe mais connexion refusee (${existing.error})`,
        'Verifiez require_email_verification = false dans insforge.toml/le backend cible.',
      );
    }
    userId = existing.id;
  }

  if (!userId) {
    const existing = await uuidByEmail(account.email);
    if (existing.error) fail(`uuid introuvable pour ${account.email} : ${existing.error}`);
    userId = existing.id;
  }

  // Promotion eventuelle (idempotente) : le trigger cree le profil en client.
  const { error: roleError } = await root().database.from('profiles')
    .update({
      role: account.admin ? 'ADMIN' : 'CUSTOMER',
      first_name: account.first_name,
      last_name: account.last_name,
    })
    .eq('user_id', userId);

  if (roleError) {
    fail(`profil de ${account.email} : ${roleError.message}`);
  }

  return userId;
}

// --- commandes ----------------------------------------------------------------

function addressFor(account) {
  return {
    fullName: `${account.first_name} ${account.last_name}`,
    email: account.email,
    phone: '+216 71 000 000',
    line1: 'Avenue de la Republique 1',
    city: SEED_CITY,
    postalCode: '1000',
    country: 'Tunisie',
  };
}

async function seedOrders(ids) {
  const [clientA, clientB] = ids;

  // Produits reellement presents sur la base cible (catalogue de depart).
  const { data: products, error: productsError } = await root().database.from('products')
    .select('id');
  if (productsError) fail(`lecture des produits : ${productsError.message}`);
  if (!products || products.length < 3) {
    fail(`catalogue insuffisant (${products?.length ?? 0} produits) — migrations de seed absentes ?`);
  }
  const [p0, p1, p2] = products;

  // Nettoyage des anciennes donnees de seed (rejouabilite).
  const owned = await root().database.from('orders')
    .select('id')
    .in('user_id', [clientA, clientB]);
  if (owned.error) fail(`lecture des commandes : ${owned.error.message}`);
  const guest = await root().database.from('orders')
    .select('id')
    .eq('payment_method', GUEST_PAYMENT_MARKER);
  if (guest.error) fail(`lecture des commandes invitees : ${guest.error.message}`);

  const staleIds = [...(owned.data ?? []), ...(guest.data ?? [])].map((o) => o.id);
  if (staleIds.length > 0) {
    const delItems = await root().database.from('order_items').delete().in('order_id', staleIds);
    if (delItems.error) fail(`nettoyage order_items : ${delItems.error.message}`);
    const delOrders = await root().database.from('orders').delete().in('id', staleIds);
    if (delOrders.error) fail(`nettoyage orders : ${delOrders.error.message}`);
  }

  const addrA = addressFor(ACCOUNTS[0]);
  const addrB = addressFor(ACCOUNTS[1]);

  const orders = [
    {
      id: randomUUID(),
      user_id: clientA,
      status: 'PENDING',
      payment_status: 'PENDING',
      subtotal: 259.8,
      shipping: 7,
      tax: 0,
      total: 266.8,
      shipping_address: addrA,
      billing_address: addrA,
      payment_method: 'COD',
    },
    {
      id: randomUUID(),
      user_id: clientA,
      status: 'SHIPPED',
      payment_status: 'PAID',
      subtotal: 149.9,
      shipping: 7,
      tax: 0,
      total: 156.9,
      shipping_address: addrA,
      billing_address: addrA,
      payment_method: 'COD',
    },
    {
      id: randomUUID(),
      user_id: clientB,
      status: 'DELIVERED',
      payment_status: 'PAID',
      subtotal: 319.8,
      shipping: 7,
      tax: 0,
      total: 326.8,
      shipping_address: addrB,
      billing_address: addrB,
      payment_method: 'CARD',
    },
    {
      id: randomUUID(),
      // Commande invitee : user_id nul (aucun compte rattache).
      status: 'CANCELLED',
      payment_status: 'REFUNDED',
      subtotal: 99.9,
      shipping: 7,
      tax: 0,
      total: 106.9,
      shipping_address: addrA,
      billing_address: addrA,
      payment_method: GUEST_PAYMENT_MARKER,
    },
  ];

  const insertOrders = await root().database.from('orders').insert(orders);
  if (insertOrders.error) fail(`insertion des commandes : ${insertOrders.error.message}`);

  const items = [
    { order_id: orders[0].id, product_id: p0.id, user_id: clientA, quantity: 2, price: 129.9, size: '42' },
    { order_id: orders[1].id, product_id: p1.id, user_id: clientA, quantity: 1, price: 149.9, size: '43' },
    { order_id: orders[2].id, product_id: p0.id, user_id: clientB, quantity: 1, price: 189.9, size: '41' },
    { order_id: orders[2].id, product_id: p2.id, user_id: clientB, quantity: 1, price: 129.9, size: '44' },
    { order_id: orders[3].id, product_id: p2.id, quantity: 1, price: 99.9, size: '42' },
  ];

  const insertItems = await root().database.from('order_items').insert(items);
  if (insertItems.error) fail(`insertion des articles : ${insertItems.error.message}`);

  return orders.length;
}

// --- execution ----------------------------------------------------------------

console.log(`> cible : ${baseUrl}${isProd ? '  [PRODUCTION - autorise par --allow-prod]' : ''}`);

const ids = [];
for (const account of ACCOUNTS) {
  const id = await ensureAccount(account);
  ids.push(id);
  console.log(`  compte ${account.email} -> ${account.admin ? 'ADMIN' : 'CUSTOMER'} (${id})`);
}

const orderCount = await seedOrders(ids);
console.log(`  ${orderCount} commandes factices + articles inserees`);

console.log(`
Seed termine. Identifiants de test (staging uniquement) :
  client A : seed.client-a@q2m.test / ${PASSWORD}
  client B : seed.client-b@q2m.test / ${PASSWORD}
  admin    : seed.admin@q2m.test    / ${PASSWORD}
`);

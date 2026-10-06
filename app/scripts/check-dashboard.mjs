/**
 * Verifie le rendu du back-office avec une vraie session admin.
 *
 *   node scripts/check-dashboard.mjs <email> <motdepasse>
 */
import { readFileSync } from 'node:fs';

const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envFile.split(/\r?\n/)) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const base = process.env.INSFORGE_URL;
const anon = process.env.INSFORGE_ANON_KEY;
const app = 'http://localhost:3000';
const [email, password] = process.argv.slice(2);

const res = await fetch(`${base}/api/auth/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
  body: JSON.stringify({ email, password }),
});
const session = await res.json();

if (!session.accessToken) {
  console.log('connexion impossible :', res.status, session.error ?? '');
  process.exit(1);
}
console.log('connecte :', session.user.email);

const cookie = `insforge_access_token=${session.accessToken}; insforge_refresh_token=${session.refreshToken}`;

const PAGES = [
  '/fr/dashboard',
  '/fr/dashboard/users',
  '/fr/dashboard/orders',
  '/fr/dashboard/products',
  '/fr/dashboard/promotions',
  '/fr/dashboard/drops',
  '/fr/dashboard/analytics',
  '/fr/dashboard/settings',
  '/en/dashboard',
  '/ar/dashboard/users',
];

// Residus du cyberpunk ancien et de la marque NOVA.
const RESIDUS = [/NOVA DISTRICT/i, /#CCFF00/i, /neon-primary/i, /glass-panel/i, /\bEUR\b/, /USD/i];

for (const path of PAGES) {
  const page = await fetch(`${app}${path}`, { headers: { cookie }, redirect: 'manual' });
  const html = await page.text();
  const found = RESIDUS.filter((re) => re.test(html)).map((re) => re.source);
  console.log(
    path.padEnd(28),
    page.status,
    `${(html.length / 1024).toFixed(0)} ko`,
    found.length ? `RESIDUS: ${found.join(', ')}` : 'clean',
  );
}

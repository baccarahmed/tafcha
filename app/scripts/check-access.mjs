/**
 * Verifie que le back-office refuse un compte non admin.
 *
 * Le test est reversible : le role du compte est abaisse en CUSTOMER le temps
 * de la requete, puis restaure en ADMIN dans un finally.
 *
 *   node scripts/check-access.mjs <email> <motdepasse>
 */
import { readFileSync } from 'node:fs';
import { createAdminClient } from '@insforge/sdk';

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
const setRole = (role) =>
  createAdminClient({ baseUrl: base, apiKey: process.env.INSFORGE_API_KEY })
    .database.from('profiles')
    .update({ role })
    .eq('user_id', session.user.id);

try {
  const { error: demoteError } = await setRole('CUSTOMER');
  if (demoteError) throw new Error(demoteError.message);

  console.log('\nrole force a CUSTOMER :');
  for (const path of ['/fr/dashboard', '/fr/dashboard/users', '/ar/dashboard/settings']) {
    const page = await fetch(`${app}${path}`, { headers: { cookie }, redirect: 'manual' });
    console.log(' ', path.padEnd(24), page.status, page.headers.get('location') ?? 'rendu direct');
  }
} finally {
  const { error: restoreError } = await setRole('ADMIN');
  console.log('\nrole restaure :', restoreError ? `ECHEC ${restoreError.message}` : 'ADMIN');
}
/**
 * Verifie que le module admin lit bien les donnees reelles.
 *
 *   npx tsx scripts/check-admin-data.mjs
 */
import { readFileSync } from 'node:fs';
import { createAdminClient } from '@insforge/sdk';

const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envFile.split(/\r?\n/)) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const admin = createAdminClient({
  baseUrl: process.env.INSFORGE_URL,
  apiKey: process.env.INSFORGE_API_KEY,
});

const { data: profiles, error } = await admin.database
  .from('profiles')
  .select('user_id,email,first_name,last_name,role,created_at')
  .order('created_at', { ascending: false });

if (error) {
  console.error('ERREUR profiles :', error.message);
  process.exit(1);
}

console.log('profils :', profiles.length);
for (const p of profiles) {
  console.log(
    `  ${p.role.padEnd(9)} ${p.email ?? '(sans email)'} — ${p.first_name ?? ''} ${p.last_name ?? ''}`,
  );
}

const { data: orders, error: ordersError } = await admin.database
  .from('orders')
  .select('id,user_id,status,payment_status,payment_method,subtotal,shipping,total,created_at');

console.log('\ncommandes :', orders?.length ?? 0, ordersError ? `(erreur: ${ordersError.message})` : '');
for (const o of orders ?? []) {
  console.log(`  ${o.status} ${o.total} ${o.payment_status}`);
}

const { data: promotions, error: promosError } = await admin.database
  .from('promotions')
  .select('id,name,description,type,percentage,start_date,end_date,active');

console.log('\npromotions :', promotions?.length ?? 0, promosError ? `(erreur: ${promosError.message})` : '');
for (const p of promotions ?? []) {
  console.log(`  ${p.name} — ${p.type} ${p.percentage ?? ''} active=${p.active}`);
}

const { data: products, error: productsError } = await admin.database
  .from('products')
  .select('id,slug,name,brand,price,stock,active,is_new_drop');

console.log('\nproduits :', products?.length ?? 0, productsError ? `(erreur: ${productsError.message})` : '');
for (const p of products ?? []) {
  console.log(`  ${p.name} — ${p.brand} ${p.price} stock=${p.stock} active=${p.active}`);
}

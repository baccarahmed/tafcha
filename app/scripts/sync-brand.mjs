/**
 * Remplace la marque NOVA dans les donnees produits.
 *
 *   node scripts/sync-brand.mjs
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

const { data, error } = await admin.database.from('products').select('id,brand,name,description');

if (error) {
  console.error('lecture impossible :', error.message);
  process.exit(1);
}

const touched = [];

for (const product of data ?? []) {
  const patch = {};

  if (/NOVA DISTRICT/i.test(product.brand ?? '')) {
    patch.brand = product.brand.replace(/NOVA DISTRICT/gi, 'Q2M').trim();
  }
  if (/NOVA x KINETIC/i.test(product.brand ?? '')) {
    patch.brand = 'Q2M x KINETIC';
  }
  if (/District/i.test(product.name ?? '')) {
    patch.name = product.name.replace(/District/gi, 'Rive').trim();
  }
  if (/\bNova Court\b/i.test(product.name ?? '')) {
    patch.name = (patch.name ?? product.name).replace(/\bNova Court\b/gi, 'Rive Court');
  }
  if (/NOVA/i.test(product.description ?? '')) {
    patch.description = product.description
      .replace(/NOVA DISTRICT/gi, 'Q2M')
      .replace(/NOVA x KINETIC/gi, 'Q2M x KINETIC')
      .replace(/\bNOVA\b/gi, 'Q2M');
  }

  if (Object.keys(patch).length === 0) continue;

  const { error: updateError } = await admin.database
    .from('products')
    .update(patch)
    .eq('id', product.id);

  if (updateError) {
    console.error(`echec sur ${product.name} :`, updateError.message);
    process.exit(1);
  }

  touched.push({ avant: { brand: product.brand, name: product.name }, apres: patch });
}

console.log(`${touched.length} produit(s) mis a jour\n`);
for (const item of touched) {
  console.log(JSON.stringify(item));
}

const { data: after } = await admin.database.from('products').select('name,brand');
console.log('\netat final :');
for (const p of after ?? []) console.log(`  ${p.brand} — ${p.name}`);

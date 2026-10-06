/**
 * Ramene la ligne 'main' de site_settings a la direction Q2M.
 *
 *   node scripts/sync-site-settings.mjs
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

const { error } = await admin.database
  .from('site_settings')
  .update({
    hero_subtitle:
      'Des sneakers premium, selectionnees a Tunis. Runners, silhouettes retro et drops limites - disponibilite comptee.',
    contact_email: 'contact@q2m.tn',
    contact_phone: '',
    contact_address: 'Tunis, Tunisie',
    social_instagram: 'https://instagram.com/q2m.tn',
    announcement_text:
      'LIVRAISON OFFERTE DES 200 TND,RETOURS SOUS 14 JOURS,DROP 02 - EN LIGNE',
    free_shipping_threshold_dnt: 200,
    shipping_cost_dnt: 10,
    site_bg_color: '#F6F4EF',
    site_panel_color: '#E9E4DA',
    announcement_bg_color: '#090909',
    announcement_text_color: '#E9E4DA',
  })
  .eq('id', 'main');

if (error) {
  console.error('echec :', error.message);
  process.exit(1);
}

const { data, error: readError } = await admin.database
  .from('site_settings')
  .select(
    'hero_title,hero_subtitle,contact_email,contact_address,announcement_text,' +
      'free_shipping_threshold_dnt,shipping_cost_dnt',
  )
  .eq('id', 'main')
  .maybeSingle();

if (readError) {
  console.error('lecture impossible :', readError.message);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));

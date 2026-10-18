/**
 * Enregistre (ou met a jour) le webhook du bot Telegram et son menu de
 * commandes.
 *
 *   node scripts/telegram-webhook.mjs [https://mon-domaine]
 *
 * L'URL est lue depuis l'argument, sinon depuis NEXT_PUBLIC_SITE_URL de
 * .env.local. Le token et le secret ne sont jamais affiches : seules les
 * reponses de l'API Telegram le sont.
 *
 * A relancer apres un changement de domaine ou de secret ; sans cela le bot
 * reste muet, car les commandes des administrateurs ne partent que si le
 * webhook est declare.
 */
import { readFileSync } from 'node:fs';

const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envFile.split(/\r?\n/)) {
  const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const baseUrl = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN absent de .env.local');
  process.exit(1);
}

if (!secret) {
  console.error(
    'TELEGRAM_WEBHOOK_SECRET absent de .env.local : generez-en un (ex. openssl rand -hex 32) avant d\u2019enregistrer le webhook.',
  );
  process.exit(1);
}

if (!/^https:\/\//.test(baseUrl)) {
  console.error(`URL de base invalide : "${baseUrl}" (attendu https://...)`);
  process.exit(1);
}

const webhookUrl = `${baseUrl}/api/telegram`;

async function call(method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.ok) {
    console.error(`${method} → echec : ${body?.description ?? response.status}`);
    process.exit(1);
  }

  return body.result;
}

const me = await call('getMe');
console.log(`Bot : @${me.username} (id ${me.id})`);

await call('setWebhook', {
  url: webhookUrl,
  secret_token: secret,
  allowed_updates: ['message', 'callback_query'],
  drop_pending_updates: true,
});
console.log(`Webhook : ${webhookUrl}`);

const commands = [
  { command: 'orders', description: 'Les dernieres commandes' },
  { command: 'order', description: 'Detail d\u2019une commande (#REF)' },
  { command: 'stats', description: 'Chiffre d\u2019affaires (today/week/month)' },
  { command: 'stock', description: 'Produits bientot en rupture' },
  { command: 'setstatus', description: 'Changer le statut d\u2019une commande' },
  { command: 'ship', description: 'Marquer une commande expediee' },
  { command: 'help', description: 'Aide' },
];

await call('setMyCommands', { commands });
console.log(`Menu : ${commands.length} commande(s) declaree(s)`);

const info = await call('getWebhookInfo');
console.log(`Etat : ${info.url || '(aucun webhook)'} — en attente : ${info.pending_update_count ?? 0}`);
if (info.last_error_message) {
  console.warn(`Derniere erreur Telegram : ${info.last_error_message}`);
}

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
  // Lecture
  { command: 'orders', description: 'Les dernières commandes' },
  { command: 'order', description: 'Détail d’une commande (REF)' },
  { command: 'stats', description: 'Ventes (today/week/month)' },
  { command: 'stock', description: 'Produits bientôt en rupture' },
  { command: 'products', description: 'Chercher dans le catalogue' },
  { command: 'product', description: 'Fiche d’un produit (REF)' },
  { command: 'customers', description: 'Chercher un client' },
  { command: 'promos', description: 'Lister les promotions' },
  { command: 'settings', description: 'Voir les réglages vitrine' },
  { command: 'actions', description: 'Journal du bot' },
  // Commandes
  { command: 'ship', description: 'Marquer une commande expédiée' },
  { command: 'deliver', description: 'Marquer une commande livrée' },
  { command: 'cancel', description: 'Annuler une commande' },
  { command: 'setstatus', description: 'Changer le statut d’une commande' },
  { command: 'setpayment', description: 'Changer le paiement d’une commande' },
  { command: 'note', description: 'Note interne sur une commande' },
  { command: 'delivery', description: 'Fenêtre de livraison d’une commande' },
  // Produits
  { command: 'setstock', description: 'Stock par pointure (42:5 43:3)' },
  { command: 'addstock', description: 'Ajouter du stock par pointure' },
  { command: 'setprice', description: 'Changer le prix (et prix barré)' },
  { command: 'activate', description: 'Rendre un produit visible' },
  { command: 'deactivate', description: 'Masquer un produit' },
  { command: 'feature', description: 'Mettre en avant (on|off)' },
  { command: 'newdrop', description: 'Nouveau drop (on|off)' },
  { command: 'duplicate', description: 'Créer un coloris' },
  { command: 'delproduct', description: 'Supprimer un produit' },
  // Clients
  { command: 'promote', description: 'Donner les droits admin' },
  { command: 'demote', description: 'Retirer les droits admin' },
  // Promotions
  { command: 'promo_on', description: 'Activer une promotion' },
  { command: 'promo_off', description: 'Désactiver une promotion' },
  { command: 'promo_new', description: 'Créer une promotion globale' },
  { command: 'promo_target', description: 'Cibler des produits' },
  { command: 'promo_del', description: 'Supprimer une promotion' },
  // Vitrine
  { command: 'announce', description: 'Bandeau d’annonce (− pour vider)' },
  { command: 'maintenance', description: 'Mode maintenance (on|off)' },
  { command: 'shipping', description: 'Frais de livraison' },
  { command: 'freeship', description: 'Seuil de livraison offerte' },
  { command: 'set', description: 'Modifier un réglage vitrine' },
  { command: 'help', description: 'Aide' },
];

await call('setMyCommands', { commands });
console.log(`Menu : ${commands.length} commande(s) declaree(s)`);

const info = await call('getWebhookInfo');
console.log(`Etat : ${info.url || '(aucun webhook)'} — en attente : ${info.pending_update_count ?? 0}`);
if (info.last_error_message) {
  console.warn(`Derniere erreur Telegram : ${info.last_error_message}`);
}

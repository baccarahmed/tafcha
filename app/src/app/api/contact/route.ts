import { NextResponse } from 'next/server';
import { submitContactMessage } from '@/lib/catalog';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/**
 * La route ne renvoie qu'un code, jamais un texte : le message est traduit par
 * `contact-view` a partir de `contact.error_*`. Un libelle ecrit ici
 * resterait en francais sur les pages anglaises et arabes.
 */

// 5 envois par minute et par IP : confortable pour un humain (y compris le
// bouton "envoyer un autre message"), sans effet sur un script de spam.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

// Longueurs acceptees par la base : au-dela, on tronque plutot que de laisser
// un client envoyer un payload de megaoctets en base.
const MAX_LENGTHS = {
  name: 200,
  email: 320,
  subject: 300,
  message: 5_000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const limit = await rateLimit(`contact:${clientIp(request)}`, MAX_PER_WINDOW, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rateLimited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    // Corps non-JSON : faute du client, pas une erreur serveur.
    return NextResponse.json({ error: 'invalidBody' }, { status: 400 });
  }

  try {
    const name = String(body?.name ?? '').trim().slice(0, MAX_LENGTHS.name);
    const email = String(body?.email ?? '').trim().slice(0, MAX_LENGTHS.email);
    const subject = String(body?.subject ?? '').trim().slice(0, MAX_LENGTHS.subject);
    const message = String(body?.message ?? '').trim().slice(0, MAX_LENGTHS.message);

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'missingFields' }, { status: 400 });
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalidEmail' }, { status: 400 });
    }

    await submitContactMessage({ name, email, message, subject: subject || undefined });
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Le client ne voit qu'un code traduit ; la cause reste dans les logs.
    console.error('contact:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

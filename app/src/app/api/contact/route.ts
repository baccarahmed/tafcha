import { NextResponse } from 'next/server';
import { submitContactMessage } from '@/lib/catalog';

/**
 * La route ne renvoie qu'un code, jamais un texte : le message est traduit par
 * `contact-view` a partir de `contact.error_*`. Un libelle ecrit ici
 * resterait en francais sur les pages anglaises et arabes.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim();
    const subject = String(body?.subject ?? '').trim();
    const message = String(body?.message ?? '').trim();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'missingFields' }, { status: 400 });
    }

    await submitContactMessage({ name, email, message, subject: subject || undefined });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { subscribeToNewsletter } from '@/lib/catalog';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const limit = rateLimit(`newsletter:${clientIp(request)}`, MAX_PER_WINDOW, WINDOW_MS);
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
    return NextResponse.json({ error: 'invalidBody' }, { status: 400 });
  }

  try {
    const email = String(body?.email ?? '').trim().slice(0, 320);

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalidEmail' }, { status: 400 });
    }

    await subscribeToNewsletter(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('newsletter:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

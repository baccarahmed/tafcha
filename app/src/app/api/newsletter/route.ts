import { NextResponse } from 'next/server';
import { subscribeToNewsletter } from '@/lib/catalog';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'invalidEmail' }, { status: 400 });
    }

    await subscribeToNewsletter(email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
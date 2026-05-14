import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('riti_session='));

  const sessionToken = match ? decodeURIComponent(match.split('=')[1] || '') : '';

  if (sessionToken) {
    const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
    const adminClient = getSupabaseAdmin();
    if (adminClient) {
      await adminClient
        .from('auth_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
        .is('revoked_at', null);
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('riti_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return res;
}

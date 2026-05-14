import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const VALID_CREDENTIALS = {
  username: 'sakshamaasvaa',
  password: 'Aasvaa@2026',
  user_type: 'admin',
};

const SESSION_DURATION_SECONDS = 30 * 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  const userType = String(body?.user_type || '').trim().toLowerCase();

  const isValid =
    username === VALID_CREDENTIALS.username &&
    password === VALID_CREDENTIALS.password &&
    userType === VALID_CREDENTIALS.user_type;

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid credentials or role' }, { status: 401 });
  }

  const sessionToken = `${randomUUID()}${randomUUID()}`;
  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  const adminClient = getSupabaseAdmin();
  if (adminClient) {
    const { error } = await adminClient.from('auth_sessions').insert({
      username,
      user_type: userType,
      token_hash: tokenHash,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Unable to create session record', details: error.message },
        { status: 500 }
      );
    }
  }

  const res = NextResponse.json({
    user: { username, user_type: userType },
    expiresAt,
  });

  res.cookies.set('riti_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });

  return res;
}

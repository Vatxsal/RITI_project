import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/workers');

  const hasSession = Boolean(req.cookies.get('riti_session')?.value);

  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (!isPublic && !hasSession) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*).*)'],
};

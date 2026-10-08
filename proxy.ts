/**
 * ════════════════════════════════════════════════════════════════════════════
 * PROXY - public registration lockdown
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Someone who arrives through a registration QR code / link is a guest, not a
 * user. Once they open /register/<token> this proxy pins their browser session
 * to that form: every other page redirects back to it, and every other API
 * route answers 403. They cannot wander into the website or the login screens.
 *
 * Signed-in staff are never pinned (they carry the auth cookie), so testing
 * the link from an admin browser does not lock the admin out.
 *
 * This is a UX and defence-in-depth layer, not the security boundary: every
 * private API route still enforces authentication and tenant scoping itself,
 * and the pin is a session cookie a determined person can simply discard.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PIN_COOKIE = 'reg_only';
const AUTH_COOKIE = 'auth_token';
const REFRESH_COOKIE = 'refresh_token';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const FORM_PATH = /^\/(register|church-opening)\/([A-Za-z0-9_-]{43})\/?$/;
const PUBLIC_API_PREFIX = '/api/public/registration/';

function hasStaffSession(request: NextRequest): boolean {
  return request.cookies.has(AUTH_COOKIE) || request.cookies.has(REFRESH_COOKIE);
}

function withPrivateHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const formMatch = FORM_PATH.exec(pathname);

  // Entering the form: pin the browser session to it.
  if (formMatch) {
    const response = withPrivateHeaders(NextResponse.next());
    if (!hasStaffSession(request)) {
      response.cookies.set(PIN_COOKIE, formMatch[1] === 'register' ? formMatch[2] : `church-opening:${formMatch[2]}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return response;
  }

  // Form submission endpoint is the one API a pinned guest may call.
  if ((pathname.startsWith(PUBLIC_API_PREFIX) || pathname.startsWith('/api/public/church-opening-registration/'))) {
    return NextResponse.next();
  }

  const pinnedToken = request.cookies.get(PIN_COOKIE)?.value;
  const opening = pinnedToken?.startsWith('church-opening:') ?? false;
  const token = opening ? pinnedToken!.slice('church-opening:'.length) : pinnedToken;
  if (!token || !TOKEN_PATTERN.test(token) || hasStaffSession(request)) {
    return NextResponse.next();
  }

  // Pinned guest asking for anything else.
  if (pathname.startsWith('/api/')) {
    return withPrivateHeaders(
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    );
  }

  return withPrivateHeaders(NextResponse.redirect(new URL(`/${opening ? 'church-opening' : 'register'}/${token}`, request.url)));
}

export const config = {
  // Skip Next internals and static files; everything else passes through proxy().
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)'],
};

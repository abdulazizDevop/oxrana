import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set in production');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_for_development_only'
);

const publicPaths = [
  '/api/auth',
  '/api/auth/register',
  '/api/upload',
];

function applySecurityHeaders(response: NextResponse, cspHeader: string) {
  if (cspHeader) {
    response.headers.set('Content-Security-Policy', cspHeader);
  }
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https: http:;
    font-src 'self' data:;
    connect-src 'self' https: http: wss: ws:;
    frame-src 'self' https: http:;
    object-src 'none';
    base-uri 'none';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  // Basic CSRF Protection: Validate Origin on state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host) {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return applySecurityHeaders(NextResponse.json({ error: 'CSRF token mismatch or invalid origin' } , { status: 403 }), cspHeader);
      }
    }
  }

  // Only protect /api routes
  if (pathname.startsWith('/api')) {
    if (publicPaths.some(p => pathname.startsWith(p))) {
      return applySecurityHeaders(NextResponse.next(), cspHeader);
    }

    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return applySecurityHeaders(NextResponse.json({ error: 'Unauthorized: No token provided' } , { status: 401 }), cspHeader);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Role-Based Access Control (RBAC)
      const method = request.method;
      const isAdmin = payload?.is_admin === true;
      const allowedSections = (payload?.allowed_sections as string[]) || [];
      
      // Protect Admin-Only Routes
      const adminOnlyPrefixes = ['/api/admin', '/api/cameras', '/api/seed-test-users'];
      if (!isAdmin && adminOnlyPrefixes.some(prefix => pathname.startsWith(prefix))) {
        return applySecurityHeaders(NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }), cspHeader);
      }

      // Restrict mutating Users/Cities/Companies
      if (!isAdmin && ['PUT', 'DELETE'].includes(method)) {
        if (pathname.startsWith('/api/cities') || pathname.startsWith('/api/companies') || pathname.startsWith('/api/applications') || pathname.startsWith('/api/post-accounting')) {
           return applySecurityHeaders(NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }), cspHeader);
        }
      }
      
      // Managers can POST cities and companies, but only Admins can DELETE/PUT them (general cities/companies)
      // Actually, managers need to POST their own.

      // User route restriction (only admins or managers with 'employees' section)
      if (pathname.startsWith('/api/users') && !isAdmin && ['POST', 'PUT', 'DELETE'].includes(method)) {
         if (!allowedSections.includes('employees')) {
            return applySecurityHeaders(NextResponse.json({ error: 'Forbidden: Employees access required' }, { status: 403 }), cspHeader);
         }
      }

      // We allow the request
      return applySecurityHeaders(NextResponse.next(), cspHeader);

    } catch (err) {
      return applySecurityHeaders(NextResponse.json({ error: 'Unauthorized: Invalid token' } , { status: 401 }), cspHeader);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // Security Headers for frontend
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });
  
  return applySecurityHeaders(response, nonce, cspHeader);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

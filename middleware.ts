import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

async function getValidToken(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) return null;

  const { exp } = token as { exp?: number };
  const now = Math.floor(Date.now() / 1000);
  if (exp && exp < now) return null;

  return token;
}

function redirectToSignin(request: NextRequest) {
  return NextResponse.redirect(new URL('/auth/signin', request.url));
}

function isProtectedPath(pathname: string): boolean {
  const protectedPaths = ['/dashboard', '/analytics'];
  return protectedPaths.some((path) => pathname.startsWith(path));
}

function isPublicPath(pathname: string): boolean {
  const publicPaths = ['/auth/signin', '/auth/error', '/auth/verify-request'];
  return publicPaths.some((path) => pathname.startsWith(path));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes (except auth which is handled by NextAuth)
  if (isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Handle root path redirect
  if (pathname === '/') {
    const token = await getValidToken(request);
    const redirectUrl = token ? '/dashboard' : '/auth/signin';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Protect dashboard and analytics routes
  if (isProtectedPath(pathname)) {
    const token = await getValidToken(request);
    if (!token) {
      return redirectToSignin(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
  const publicPaths = ['/auth/signin', '/auth/error', '/auth/verify-request', '/api/auth'];
  return publicPaths.some((path) => pathname.startsWith(path));
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    const token = await getValidToken(request);
    const redirectUrl = token ? '/dashboard' : '/auth/signin';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  if (isProtectedPath(pathname)) {
    const token = await getValidToken(request);
    if (!token) {
      return redirectToSignin(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/analytics/:path*'],
};

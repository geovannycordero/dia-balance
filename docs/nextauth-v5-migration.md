# NextAuth v4 → Auth.js v5 Migration Plan

## Overview

Auth.js v5 (`next-auth@5`) is a complete architectural rewrite. The public API surface shrinks significantly — the central `auth()` function replaces both `getServerSession` and `getToken`, middleware integration is first-class, and types are derived automatically from the config rather than augmented via module declaration.

**Scope of changes:** 14 files + 2 package removals.  
**Risk level:** High — touches every authentication path in the app.  
**Estimated effort:** 1–2 days of focused work including testing.

---

## 1. Package Changes

```bash
yarn remove next-auth @next-auth/prisma-adapter
yarn add next-auth@^5.0.0 @auth/prisma-adapter
```

| Before | After |
|---|---|
| `next-auth@^4.24.14` | `next-auth@^5.0.0` |
| `@next-auth/prisma-adapter@^1.0.7` | `@auth/prisma-adapter` |

The `@auth/prisma-adapter` package is identical in behavior — it was extracted from `@next-auth/prisma-adapter` during the v5 rewrite.

---

## 2. Environment Variables

Rename variables in `.env`, `.env.example`, and `ci.yml` / `pr-validation.yml`:

| Before | After |
|---|---|
| `NEXTAUTH_SECRET` | `AUTH_SECRET` |
| `NEXTAUTH_URL` | `AUTH_URL` (optional — auto-detected from request in most deployments) |
| `NEXTAUTH_DEBUG` | Remove — use `debug: true` in the config |

**Important:** Update all GitHub Actions workflow files that set these as env vars during build/test steps.

---

## 3. Core Auth Configuration — `src/lib/auth.ts`

This is the biggest structural change. v5 exports `auth`, `handlers`, `signIn`, and `signOut` from a single `NextAuth()` call, replacing the `authOptions` object pattern.

### Before (v4)
```ts
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  ...
  callbacks: {
    async jwt({ token, user }) { ... },
    async session({ session, token }) {
      if (session.user && (token as any).userId) {
        (session.user as any).id = (token as any).userId;
      }
      return session;
    },
  }
};
```

### After (v5)
```ts
import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';   // or keep Email provider

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    // ... same providers, adjusted (see §3a below)
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;   // no cast needed — user.id is typed
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;  // still needs cast until types are declared
      }
      return session;
    },
    async signIn({ user }) { ... },  // unchanged
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
});
```

### §3a — Provider changes

**Email provider:** The `EmailProvider` import remains the same path but the config object notation is used differently. The `sendVerificationRequest` override still works identically.

```ts
// v4
import EmailProvider, { type EmailConfig } from 'next-auth/providers/email';
EmailProvider({ server: '', from: ..., sendVerificationRequest: ... })

// v5 — same import path, same API
import Email from 'next-auth/providers/email';
Email({ from: ..., sendVerificationRequest: ... })
// 'server' option is no longer required when sendVerificationRequest is overridden
```

**Credentials provider:**
```ts
// v4
import CredentialsProvider from 'next-auth/providers/credentials';
CredentialsProvider({ id: 'email-code', credentials: {...}, authorize: async (creds) => ... })

// v5
import Credentials from 'next-auth/providers/credentials';
Credentials({ id: 'email-code', credentials: {...}, authorize: async (creds) => ... })
// authorize() return type is now User | null — same shape as before
```

### §3b — Custom cookie config

The explicit cookies block in `authOptions` (the `sessionToken`, `callbackUrl`, `csrfToken` objects) can be **removed entirely** in v5. Auth.js v5 automatically uses `__Secure-` prefix in production and handles `sameSite`/`httpOnly` correctly by default. Remove the entire `cookies:` key from the config.

### §3c — Types

Remove `types/next-auth.d.ts` — module augmentation is no longer needed.  
Instead, declare the custom `userId` field on the JWT in `src/lib/auth.ts` using the v5 `declare module` approach:

```ts
// At the bottom of src/lib/auth.ts
declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
    } & DefaultSession['user'];
  }
}
```

This is placed directly in `auth.ts` rather than a separate `types/` file — it's co-located with the config that produces these values.

---

## 4. API Route — `src/app/api/auth/[...nextauth]/route.ts`

### Before (v4)
```ts
import NextAuth from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### After (v5)
```ts
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

The file shrinks to 3 lines.

---

## 5. Middleware — `middleware.ts`

In v5, `auth()` can be used as middleware directly. The manual `getToken()` + expiry check logic is replaced by `auth` as a middleware callback. The `request.auth` property holds the session (or `null`).

### Before (v4)
```ts
import { getToken } from 'next-auth/jwt';

async function getValidToken(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return null;
  const { exp } = token as { exp?: number };
  if (exp && exp < Math.floor(Date.now() / 1000)) return null;
  return token;
}

export default async function middleware(request: NextRequest) {
  // ... uses getValidToken()
}
```

### After (v5)
```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth(async (request) => {
  const { auth: session } = request;
  const pathname = request.nextUrl.pathname;

  if (isApiRoute(pathname)) return NextResponse.next();
  if (isPublicPath(pathname)) return NextResponse.next();

  if (pathname === '/') {
    const redirectUrl = session ? '/dashboard' : '/auth/signin';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  if (isProtectedPath(pathname) && !session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
```

Notes:
- The manual expiry check is no longer needed — Auth.js v5 handles token expiry automatically before the middleware callback fires.
- The `auth` callback receives the standard `NextRequest` extended with `request.auth`.
- Keep the `isApiRoute`, `isPublicPath`, `isProtectedPath` helper functions unchanged.

---

## 6. Server-Side Auth Access — 5 pages + 4 API routes

Every file that calls `getServerSession(authOptions)` needs two changes:

1. Change import: `getServerSession` from `'next-auth/next'` → `auth` from `'@/lib/auth'`
2. Change call: `getServerSession(authOptions)` → `auth()`

The returned `session` object shape remains the same: `{ user: { id, name, email } }` or `null`.

**Files to update:**

| File | Pattern |
|---|---|
| `src/app/page.tsx` | `const session = await auth()` |
| `src/app/dashboard/page.tsx` | `const session = await auth()` |
| `src/app/analytics/page.tsx` | `const session = await auth()` |
| `src/app/settings/page.tsx` | `const session = await auth()` |
| `src/app/api/settings/route.ts` | `const session = await auth()` |
| `src/app/api/actions/route.ts` | `const session = await auth()` |
| `src/app/api/actions/[id]/route.ts` | `const session = await auth()` |
| `src/app/api/analytics/route.ts` | `const session = await auth()` |

**Before (v4 — in each file):**
```ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const session = await getServerSession(authOptions);
const userId = (session?.user as any).id;
```

**After (v5):**
```ts
import { auth } from '@/lib/auth';

const session = await auth();
const userId = session?.user.id;  // properly typed — no cast needed
```

---

## 7. Client Components — `useSession`, `signIn`, `signOut`

These are **unchanged** in v5. The `next-auth/react` exports remain identical:

- `src/lib/use-auth.tsx` — `useSession`, `signOut`: no changes
- `src/components/Navigation.tsx` — `useSession`, `signOut`: no changes
- `src/app/auth/signin/page.tsx` — `signIn`: no changes
- `src/components/SessionProviderWrapper.tsx` — `SessionProvider`: no changes

---

## 8. Type Definitions — `types/next-auth.d.ts`

**Delete this file.** Type augmentation is moved into `src/lib/auth.ts` (see §3c). Remove it from `tsconfig.json`'s include array as well, or leave the `types/**/*.d.ts` glob (it simply won't match any file).

---

## 9. Mock Files — Tests

The test mock at `src/__mocks__/next-auth/next.ts` mocks `getServerSession`. In v5, the equivalent is mocking `auth` from `@/lib/auth`.

### Before
```ts
// src/__mocks__/next-auth/next.ts
export const getServerSession = () => Promise.resolve(null);
```

### After
Create a new mock at `src/__mocks__/lib/auth.ts`:
```ts
export const auth = jest.fn().mockResolvedValue(null);
export const handlers = { GET: jest.fn(), POST: jest.fn() };
export const signIn = jest.fn();
export const signOut = jest.fn();
```

Delete `src/__mocks__/next-auth/next.ts`.

Update test files that mock `getServerSession`:
```ts
// Before
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));

// After
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
  handlers: { GET: jest.fn(), POST: jest.fn() },
}));
```

**Test files to update:**
- `src/app/api/actions/[id]/__tests__/route.test.ts`
- `src/app/api/actions/__tests__/route.test.ts`
- `src/app/api/analytics/__tests__/route.test.ts`
- `src/app/api/settings/__tests__/route.test.ts`
- `src/app/api/auth/[...nextauth]/__tests__/route.test.ts`

---

## 10. Prisma Schema

No changes needed. The `@auth/prisma-adapter` uses the same schema conventions as `@next-auth/prisma-adapter`. The `User`, `Account`, `Session`, and `VerificationToken` models remain identical.

---

## 11. GitHub Actions Workflows

In `.github/workflows/ci.yml` and `pr-validation.yml`, update the env vars used in build steps:

```yaml
# Before
env:
  NEXTAUTH_SECRET: dummy-secret-for-build-only
  NEXTAUTH_URL: http://localhost:3000

# After
env:
  AUTH_SECRET: dummy-secret-for-build-only
  AUTH_URL: http://localhost:3000
```

---

## Implementation Order

Run `yarn type-check` and `yarn test` after each step to catch regressions early.

1. **Packages**: `yarn remove next-auth @next-auth/prisma-adapter && yarn add next-auth@^5.0.0 @auth/prisma-adapter`
2. **`src/lib/auth.ts`**: Rewrite to v5 config, export `{ auth, handlers, signIn, signOut }`, add inline type declarations
3. **`src/app/api/auth/[...nextauth]/route.ts`**: Swap to `handlers` export
4. **`middleware.ts`**: Replace `getToken` with `auth` callback pattern
5. **8 server pages/routes**: Replace `getServerSession(authOptions)` with `auth()`
6. **`types/next-auth.d.ts`**: Delete file
7. **Mocks**: Replace `src/__mocks__/next-auth/next.ts` with `src/__mocks__/lib/auth.ts`; update 5 test files
8. **Env vars**: Update `.env.example`, CI workflows, any Vercel/deployment config
9. **Full verification**: `yarn type-check && yarn lint && yarn test && yarn build`

---

## Known Risks & Caveats

| Risk | Detail |
|---|---|
| **Two-step email flow** | The custom Email + Credentials combo (send code → verify code) is non-standard. Verify that the `VerificationToken` creation/deletion in `authorize()` still works correctly — run a full manual auth flow locally. |
| **v5 beta stability** | As of 2026-05, `next-auth@5` was generally available. Pin to a specific minor version (e.g., `^5.0.0`) and check the changelog before upgrading further. |
| **Cookie naming** | Removing the explicit `cookies:` block means session cookies will be renamed. Existing logged-in users will be signed out on first deploy. Communicate this to users if relevant. |
| **`debug` env var** | `NEXTAUTH_DEBUG=true` no longer works. Add `debug: process.env.AUTH_DEBUG === 'true'` to the config if you need it. |
| **Test mock update** | The test suite mocks at the `@/lib/auth` level, not the `next-auth` package level. If any test directly imports from `next-auth/next`, those will also need updating. |
| **Credentials + adapter** | Auth.js v5 with a database adapter and Credentials provider: sessions created via Credentials are always JWT (not database sessions), which matches the current `strategy: 'jwt'` config. No change needed. |

---

## Verification Checklist

- [ ] `yarn type-check` — zero errors
- [ ] `yarn lint` — zero errors
- [ ] `yarn test` — all 92 tests pass
- [ ] `yarn build` — production build succeeds
- [ ] Manual: sign-in email flow works end-to-end (request code → verify → redirected to dashboard)
- [ ] Manual: protected routes redirect to `/auth/signin` when not authenticated
- [ ] Manual: root `/` redirects based on auth state
- [ ] Manual: sign-out works and clears session
- [ ] Manual: session persists across page refreshes (JWT cookie set correctly)

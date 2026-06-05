# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Node version

Use Node 24 via nvm: `nvm use 24`

## Commands

```bash
# Development
yarn dev                          # Start dev server (http://localhost:3000)
yarn build                        # Generate Prisma client + Next.js build
yarn type-check                   # TypeScript check (no emit)

# Linting & formatting
yarn lint                         # ESLint
yarn lint:fix                     # ESLint --fix + Prettier write
yarn format:check                 # Check formatting only

# Testing
yarn test                         # Run all tests
yarn test:watch                   # Watch mode
yarn test:coverage                # Coverage report
yarn test -- --testPathPattern="src/app/api/actions/__tests__"  # Run a single test file

# Database (requires Docker)
docker-compose up -d              # Start local PostgreSQL
yarn prisma migrate dev --name <name>   # Create + apply migration
yarn prisma migrate deploy        # Apply migrations (prod)
yarn prisma db seed               # Seed with demo data
yarn prisma studio                # GUI browser for DB
```

## Architecture

**Next.js App Router with server/client split**: Every page (`page.tsx`) is a React Server Component that fetches initial data server-side and passes it to a `*Client.tsx` co-located file that handles all interactivity (forms, state, real-time updates). This keeps data fetching on the server while enabling rich client interactions.

**Authentication** (`src/lib/auth.ts`): Two-provider NextAuth setup. In development, verification codes are printed to the console instead of sending emails — no email service needed locally. In production, Resend sends the OTP. Access is gated by `User.isActive` — users must be manually created in the DB to gain access (no self-registration). The `signIn` callback enforces this. `middleware.ts` protects `/dashboard` and `/analytics` routes.

**Flat Action schema**: All health action types (blood glucose, insulin, medication, food, exercise, sleep, symptoms, weight, hydration, blood pressure) are stored in a single `Action` table with nullable type-specific columns. The discriminated union in `src/lib/action-schemas.ts` (Zod) enforces required fields per type at the API boundary.

**API routes** (`src/app/api/`): All routes use `getServerSession` to extract `userId` from the JWT token. Session userId is attached in the `jwt` callback in `authOptions` and accessed via `(session.user as any).id`.

**User preferences** (`src/lib/user-preferences.ts`): Stored as a JSON blob in `User.preferences`. Controls which action types appear in the logger and which analytics charts are visible. Parsed/validated with Zod on read; falls back to `DEFAULT_PREFERENCES` silently.

**Date handling** (`src/lib/date-utils.ts`): All timestamps stored in UTC in the DB (`@db.Timestamptz`). Client sends local datetime strings; API converts to UTC on write. Display uses the browser's local timezone via `Date` methods.

**Offline support**: Dashboard queues failed action submissions in `localStorage`. The `useOnlineStatus` hook triggers a sync flush when the browser goes back online.

**Testing**: Tests live in `__tests__/` directories next to the routes they cover. `src/__mocks__/lib/prisma.ts` provides a mock Prisma client; `src/__mocks__/next-auth/next.ts` mocks the session. Tests use Jest + `@testing-library/react`. Coverage is collected only from `src/app/api/**`.

## Path alias

`@/` resolves to `src/` (configured in `tsconfig.json` and `jest.config.js`).

## Environment variables

Copy `.env.example` to `.env`. Key variables:

- `DATABASE_URL` — PostgreSQL connection string (default matches `docker-compose.yml`)
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `RESEND_API_KEY` — only required in production; dev uses console logging

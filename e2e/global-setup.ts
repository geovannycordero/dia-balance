import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { encode } from 'next-auth/jwt';

const E2E_USER_EMAIL = 'e2e@diabalance.local';
const E2E_USER_NAME = 'E2E Test User';

async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL must be set for E2E tests');

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET must be set for E2E tests');

  // Seed E2E data
  console.error('[e2e] Seeding E2E test data...');
  execSync('node prisma/seed-e2e.mjs', { env: { ...process.env }, stdio: 'inherit' });

  // Look up the test user
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findUnique({ where: { email: E2E_USER_EMAIL } });
    if (!user) throw new Error('E2E user not found after seeding');

    // Encode a valid NextAuth JWT (same format the app uses: jwt strategy)
    const tokenExpiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const jwt = await encode({
      token: {
        email: E2E_USER_EMAIL,
        name: E2E_USER_NAME,
        sub: user.id,
        userId: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: tokenExpiry,
        jti: 'e2e-fixed-jti',
      },
      secret,
      maxAge: 30 * 24 * 60 * 60,
    });

    // Write Playwright storage state with the signed JWT as the session cookie
    const authDir = path.join(process.cwd(), 'e2e', '.auth');
    fs.mkdirSync(authDir, { recursive: true });

    const storageState = {
      cookies: [
        {
          name: 'next-auth.session-token',
          value: jwt,
          domain: 'localhost',
          path: '/',
          expires: tokenExpiry,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax' as const,
        },
      ],
      origins: [],
    };

    fs.writeFileSync(path.join(authDir, 'user.json'), JSON.stringify(storageState, null, 2));
    console.error(`[e2e] Auth cookie written for user ${user.id}`);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;

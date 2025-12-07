import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Use process.env directly with fallback for CI environments where DATABASE_URL might not be set
// Prisma client generation doesn't require a real database connection
const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/dummy';

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    seed: 'node ./prisma/seed.mjs',
  },
});

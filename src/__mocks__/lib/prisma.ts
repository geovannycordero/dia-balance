import type { PrismaClient } from '@prisma/client'

// Mock Prisma Client - functions will be set up in test files
const mockPrisma = {
  action: {
    findMany: () => Promise.resolve([]),
    findFirst: () => Promise.resolve(null),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  },
  user: {
    findUnique: () => Promise.resolve(null),
    update: () => Promise.resolve({}),
  },
  verificationToken: {
    create: () => Promise.resolve({}),
    findFirst: () => Promise.resolve(null),
    delete: () => Promise.resolve({}),
  },
}

export const prisma = mockPrisma as unknown as PrismaClient


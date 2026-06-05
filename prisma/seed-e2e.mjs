/**
 * Deterministic seed for Playwright E2E tests.
 * Fixed values — no Math.random — so TiR percentages are predictable in assertions.
 * Creates 14 days of blood glucose data with a known distribution:
 *   ~60% in target (70-180), ~25% high (>180), ~10% very high (>250), ~5% low (<70)
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set for E2E seeding');

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

export const E2E_USER_EMAIL = 'e2e@diabalance.local';
export const E2E_USER_NAME = 'E2E Test User';

// Fixed daily readings: [fasting, pre-lunch, post-lunch, bedtime] in mg/dL
const DAILY_PATTERN = [
  [115, 140, 185, 150],
  [120, 155, 210, 160],
  [110, 130, 170, 140],
  [125, 165, 260, 175],  // very high post-lunch
  [118, 138, 180, 145],
  [130, 145, 195, 155],
  [112, 128, 165, 135],
  [122, 158, 220, 165],
  [108, 135, 175, 142],
  [65, 145, 185, 152],   // low fasting
  [128, 168, 205, 160],
  [115, 140, 185, 150],
  [120, 138, 178, 148],
  [118, 142, 188, 152],
];

function makeDate(daysAgo, hours, minutes = 0) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

async function main() {
  // Upsert test user
  const user = await prisma.user.upsert({
    where: { email: E2E_USER_EMAIL },
    update: { isActive: true },
    create: {
      email: E2E_USER_EMAIL,
      name: E2E_USER_NAME,
      isActive: true,
    },
  });

  // Clear existing actions
  await prisma.action.deleteMany({ where: { userId: user.id } });

  const actions = [];
  const contexts = ['fasting', 'pre-meal', 'post-meal', 'bedtime'];
  const hours = [6, 12, 14, 22];

  for (let day = 13; day >= 0; day--) {
    const pattern = DAILY_PATTERN[day];
    for (let i = 0; i < 4; i++) {
      actions.push({
        userId: user.id,
        type: 'BLOOD_GLUCOSE',
        timestamp: makeDate(day, hours[i], 0),
        bloodGlucose: pattern[i],
        glucoseContext: contexts[i],
      });
    }

    // Insulin (pre-meal)
    actions.push({
      userId: user.id,
      type: 'INSULIN',
      timestamp: makeDate(day, 7, 55),
      insulinType: 'Rapid',
      insulinUnits: 6,
    });

    // Sleep
    actions.push({
      userId: user.id,
      type: 'SLEEP',
      timestamp: makeDate(day, 7, 0),
      sleepHours: 7.5,
      sleepQuality: 4,
    });

    // Exercise every other day
    if (day % 2 === 0) {
      actions.push({
        userId: user.id,
        type: 'EXERCISE',
        timestamp: makeDate(day, 17, 0),
        exerciseType: 'cardio',
        exerciseDuration: 30,
        exerciseIntensity: '3',
      });
    }

    // Weight every 3 days
    if (day % 3 === 0) {
      actions.push({
        userId: user.id,
        type: 'WEIGHT',
        timestamp: makeDate(day, 7, 10),
        weightValue: 82.0,
        weightUnit: 'kg',
      });
    }

    // Hydration
    actions.push({
      userId: user.id,
      type: 'HYDRATION',
      timestamp: makeDate(day, 12, 30),
      hydrationAmount: 1500,
    });
  }

  await prisma.action.createMany({ data: actions });
  console.log(`E2E seed: ${actions.length} actions for ${E2E_USER_EMAIL} over 14 days.`);
  console.log(`User ID: ${user.id}`);
  return user.id;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

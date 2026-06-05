import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL is not set for seeding');
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

function jitter(base, range) {
  return base + (Math.random() - 0.5) * 2 * range;
}

function makeDate(daysAgo, hours, minutes = 0) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

async function main() {
  const demoEmail = 'demo@diabalance.local';

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      name: 'Demo User',
      isActive: true,
    },
  });

  // Delete existing actions for clean re-seed
  await prisma.action.deleteMany({ where: { userId: user.id } });

  const actions = [];

  for (let day = 29; day >= 0; day--) {
    // Daily sinusoidal variation: days near middle of month trend slightly higher
    const dayFactor = Math.sin((day / 30) * Math.PI) * 15;

    // --- Blood Glucose readings (6-8 per day) ---
    // Fasting (6am)
    actions.push({
      userId: user.id,
      type: 'BLOOD_GLUCOSE',
      timestamp: makeDate(day, 6, 0),
      bloodGlucose: Math.round(jitter(115 + dayFactor, 20)),
      glucoseContext: 'fasting',
    });

    // Pre-breakfast (7:30am)
    actions.push({
      userId: user.id,
      type: 'BLOOD_GLUCOSE',
      timestamp: makeDate(day, 7, 30),
      bloodGlucose: Math.round(jitter(120 + dayFactor, 15)),
      glucoseContext: 'pre-meal',
    });

    // Post-breakfast (9am)
    actions.push({
      userId: user.id,
      type: 'BLOOD_GLUCOSE',
      timestamp: makeDate(day, 9, 0),
      bloodGlucose: Math.round(jitter(185 + dayFactor, 35)),
      glucoseContext: 'post-meal',
    });

    // Pre-lunch (12pm)
    actions.push({
      userId: user.id,
      type: 'BLOOD_GLUCOSE',
      timestamp: makeDate(day, 12, 0),
      bloodGlucose: Math.round(jitter(130 + dayFactor, 20)),
      glucoseContext: 'pre-meal',
    });

    // Post-lunch (2pm)
    actions.push({
      userId: user.id,
      type: 'BLOOD_GLUCOSE',
      timestamp: makeDate(day, 14, 0),
      bloodGlucose: Math.round(jitter(175 + dayFactor, 40)),
      glucoseContext: 'post-meal',
    });

    // Pre-dinner (6pm)
    actions.push({
      userId: user.id,
      type: 'BLOOD_GLUCOSE',
      timestamp: makeDate(day, 18, 0),
      bloodGlucose: Math.round(jitter(140 + dayFactor, 25)),
      glucoseContext: 'pre-meal',
    });

    // Post-dinner (8pm)
    actions.push({
      userId: user.id,
      type: 'BLOOD_GLUCOSE',
      timestamp: makeDate(day, 20, 0),
      bloodGlucose: Math.round(jitter(195 + dayFactor, 45)),
      glucoseContext: 'post-meal',
    });

    // Bedtime (10:30pm)
    actions.push({
      userId: user.id,
      type: 'BLOOD_GLUCOSE',
      timestamp: makeDate(day, 22, 30),
      bloodGlucose: Math.round(jitter(145 + dayFactor, 25)),
      glucoseContext: 'bedtime',
    });

    // --- Insulin ---
    // Rapid pre-breakfast
    actions.push({
      userId: user.id,
      type: 'INSULIN',
      timestamp: makeDate(day, 7, 25),
      insulinType: 'Rapid',
      insulinUnits: Math.round(jitter(6, 2)),
    });
    // Rapid pre-lunch
    actions.push({
      userId: user.id,
      type: 'INSULIN',
      timestamp: makeDate(day, 11, 55),
      insulinType: 'Rapid',
      insulinUnits: Math.round(jitter(5, 2)),
    });
    // Rapid pre-dinner
    actions.push({
      userId: user.id,
      type: 'INSULIN',
      timestamp: makeDate(day, 17, 55),
      insulinType: 'Rapid',
      insulinUnits: Math.round(jitter(7, 2)),
    });
    // Basal at night
    actions.push({
      userId: user.id,
      type: 'INSULIN',
      timestamp: makeDate(day, 22, 0),
      insulinType: 'Basal',
      insulinUnits: Math.round(jitter(20, 3)),
    });

    // --- Sleep (logged each morning for previous night) ---
    actions.push({
      userId: user.id,
      type: 'SLEEP',
      timestamp: makeDate(day, 7, 0),
      sleepHours: Math.round(jitter(7.5, 1) * 10) / 10,
      sleepQuality: Math.min(5, Math.max(1, Math.round(jitter(3.5, 1.5)))),
    });

    // --- Exercise (every 2-3 days) ---
    if (day % 3 !== 0) {
      const exerciseTypes = ['cardio', 'walking', 'cycling', 'swimming'];
      actions.push({
        userId: user.id,
        type: 'EXERCISE',
        timestamp: makeDate(day, 17, 0),
        exerciseType: exerciseTypes[day % exerciseTypes.length],
        exerciseDuration: Math.round(jitter(35, 15)),
        exerciseIntensity: String(Math.min(5, Math.max(1, Math.round(jitter(3, 1.5))))),
      });
    }

    // --- Weight (every 3 days) ---
    if (day % 3 === 0) {
      actions.push({
        userId: user.id,
        type: 'WEIGHT',
        timestamp: makeDate(day, 7, 10),
        weightValue: Math.round(jitter(82 + (29 - day) * 0.03, 0.3) * 10) / 10,
        weightUnit: 'kg',
      });
    }

    // --- Hydration (daily) ---
    actions.push({
      userId: user.id,
      type: 'HYDRATION',
      timestamp: makeDate(day, 12, 30),
      hydrationAmount: Math.round(jitter(1500, 400)),
    });

    // --- Blood Pressure (every 2 days) ---
    if (day % 2 === 0) {
      actions.push({
        userId: user.id,
        type: 'BLOOD_PRESSURE',
        timestamp: makeDate(day, 8, 0),
        bloodPressureSystolic: Math.round(jitter(128, 12)),
        bloodPressureDiastolic: Math.round(jitter(82, 8)),
      });
    }
  }

  await prisma.action.createMany({ data: actions });
  console.log(`Seeded ${actions.length} actions for ${demoEmail} over 30 days.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

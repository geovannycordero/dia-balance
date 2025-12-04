import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  // Create a few sample actions for the last few days
  const now = new Date();

  await prisma.action.createMany({
    data: [
      {
        userId: user.id,
        type: 'BLOOD_GLUCOSE',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        bloodGlucose: 140,
        glucoseContext: 'pre-meal',
      },
      {
        userId: user.id,
        type: 'INSULIN',
        timestamp: new Date(now.getTime() - 90 * 60 * 1000),
        insulinType: 'Rapid',
        insulinUnits: 6,
      },
      {
        userId: user.id,
        type: 'FOOD',
        timestamp: new Date(now.getTime() - 60 * 60 * 1000),
        foodDescription: 'Lunch - grilled chicken salad',
      },
      {
        userId: user.id,
        type: 'EXERCISE',
        timestamp: new Date(now.getTime() - 30 * 60 * 1000),
        exerciseType: 'cardio',
        exerciseDuration: 30,
        exerciseIntensity: '3',
      },
    ],
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

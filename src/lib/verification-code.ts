import { randomInt } from 'crypto';

import { prisma } from '@/lib/prisma';

export async function issueVerificationCode(email: string): Promise<string> {
  const code = randomInt(100000, 1000000).toString();
  const normalizedEmail = email.trim().toLowerCase();

  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: code,
      expires: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return code;
}

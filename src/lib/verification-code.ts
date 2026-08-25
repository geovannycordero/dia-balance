import { prisma } from '@/lib/prisma';

export async function issueVerificationCode(email: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
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

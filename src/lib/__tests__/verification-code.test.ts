import { prisma } from '@/lib/prisma';
import { issueVerificationCode } from '@/lib/verification-code';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    verificationToken: {
      create: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe('issueVerificationCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.verificationToken.create.mockResolvedValue({});
  });

  it('returns a 6-digit numeric code', async () => {
    const code = await issueVerificationCode('user@example.com');

    expect(code).toMatch(/^\d{6}$/);
  });

  it('generates a different code on each call', async () => {
    const first = await issueVerificationCode('user@example.com');
    const second = await issueVerificationCode('user@example.com');

    expect(first).not.toBe(second);
  });

  it('stores the code with a normalized (trimmed, lowercased) identifier', async () => {
    const code = await issueVerificationCode('  User@Example.com  ');

    expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        identifier: 'user@example.com',
        token: code,
      }),
    });
  });

  it('sets expires roughly 10 minutes from now', async () => {
    const before = Date.now();
    await issueVerificationCode('user@example.com');
    const after = Date.now();

    const { expires } = mockPrisma.verificationToken.create.mock.calls[0][0].data;

    expect(expires).toBeInstanceOf(Date);
    expect(expires.getTime()).toBeGreaterThanOrEqual(before + 9 * 60 * 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + 10 * 60 * 1000);
  });
});

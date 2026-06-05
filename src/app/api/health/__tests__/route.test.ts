import { GET } from '../route';

import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 200 with ok status when database is reachable', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ status: 'ok', db: 'ok' });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('should return 503 with error status when database is unreachable', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data).toEqual({ status: 'error', db: 'unreachable' });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('should always set Cache-Control: no-store', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const response = await GET();

      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });
  });
});

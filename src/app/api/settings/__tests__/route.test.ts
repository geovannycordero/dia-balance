import { getServerSession } from 'next-auth/next';

import { GET, PATCH } from '../route';

import { ActionType } from '@/app/constants/action-types';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PREFERENCES } from '@/lib/user-preferences';

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    action: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    verificationToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe('/api/settings', () => {
  const mockUserId = 'user-123';
  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetServerSession.mockResolvedValue(mockSession as any);
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if user email is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetServerSession.mockResolvedValue({ user: {} } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if user id is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return user settings with default preferences when preferences are null', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        preferences: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        preferences: DEFAULT_PREFERENCES,
      });
    });

    it('should return user settings with existing preferences', async () => {
      const customPreferences = {
        enabledActionTypes: [ActionType.BLOOD_GLUCOSE, ActionType.INSULIN],
        enabledAnalytics: {
          bloodGlucoseTrend: true,
          dailyGlucoseSummary: false,
          insulinVsGlucose: true,
          exerciseHydration: false,
          sleepGlucose: false,
          weightTrend: false,
          bloodPressureTrend: false,
          dailyBloodPressureSummary: false,
          bpVsGlucose: false,
          correlationAnalysis: false,
        },
      };

      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        preferences: customPreferences,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        preferences: customPreferences,
      });
    });
  });

  describe('PATCH', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid payload', async () => {
      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'a'.repeat(101), // exceeds max length
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid payload');
    });

    it('should update user name', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Old Name',
        preferences: null,
      };

      const updatedUser = {
        ...mockUser,
        name: 'New Name',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'New Name',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('New Name');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          name: 'New Name',
        },
        select: {
          id: true,
          email: true,
          name: true,
          preferences: true,
        },
      });
    });

    it('should set name to null when empty string provided', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Old Name',
        preferences: null,
      };

      const updatedUser = {
        ...mockUser,
        name: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: '',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBeNull();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          name: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          preferences: true,
        },
      });
    });

    it('should update user preferences', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        preferences: null,
      };

      const newPreferences = {
        enabledActionTypes: [ActionType.BLOOD_GLUCOSE, ActionType.INSULIN],
        enabledAnalytics: {
          bloodGlucoseTrend: true,
          dailyGlucoseSummary: true,
          insulinVsGlucose: true,
          exerciseHydration: false,
          sleepGlucose: false,
          weightTrend: false,
          bloodPressureTrend: false,
          dailyBloodPressureSummary: false,
          bpVsGlucose: false,
          correlationAnalysis: false,
        },
      };

      const updatedUser = {
        ...mockUser,
        preferences: newPreferences,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: newPreferences,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toEqual(newPreferences);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          preferences: newPreferences,
        },
        select: {
          id: true,
          email: true,
          name: true,
          preferences: true,
        },
      });
    });

    it('should return 400 for invalid preferences', async () => {
      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: {
            enabledActionTypes: ['INVALID_TYPE'],
            enabledAnalytics: {},
          },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should update both name and preferences', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Old Name',
        preferences: null,
      };

      const newPreferences = {
        enabledActionTypes: [ActionType.BLOOD_GLUCOSE],
        enabledAnalytics: DEFAULT_PREFERENCES.enabledAnalytics,
      };

      const updatedUser = {
        ...mockUser,
        name: 'New Name',
        preferences: newPreferences,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'New Name',
          preferences: newPreferences,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('New Name');
      expect(data.preferences).toEqual(newPreferences);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          name: 'New Name',
          preferences: newPreferences,
        },
        select: {
          id: true,
          email: true,
          name: true,
          preferences: true,
        },
      });
    });

    it('should not update fields that are not provided', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        preferences: DEFAULT_PREFERENCES,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await PATCH(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {},
        select: {
          id: true,
          email: true,
          name: true,
          preferences: true,
        },
      });
    });

    it('should validate name maximum length of 100 characters', async () => {
      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'a'.repeat(101), // 101 characters, exceeds max
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid payload');
    });

    it('should accept name with exactly 100 characters', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'a'.repeat(100),
        preferences: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'a'.repeat(100),
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
    });

    it('should validate preferences structure correctly', async () => {
      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: {
            enabledActionTypes: [ActionType.BLOOD_GLUCOSE],
            enabledAnalytics: {
              bloodGlucoseTrend: true,
              dailyGlucoseSummary: true,
              insulinVsGlucose: false,
              exerciseHydration: false,
              sleepGlucose: false,
              weightTrend: false,
              bloodPressureTrend: false,
              dailyBloodPressureSummary: false,
              bpVsGlucose: false,
              correlationAnalysis: false,
            },
          },
        }),
      });

      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        preferences: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        preferences: {
          enabledActionTypes: [ActionType.BLOOD_GLUCOSE],
          enabledAnalytics: {
            bloodGlucoseTrend: true,
            dailyGlucoseSummary: true,
            insulinVsGlucose: false,
            exerciseHydration: false,
            sleepGlucose: false,
            weightTrend: false,
            bloodPressureTrend: false,
            dailyBloodPressureSummary: false,
            bpVsGlucose: false,
            correlationAnalysis: false,
          },
        },
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
    });

    it('should handle partial preferences update', async () => {
      const existingPreferences = {
        enabledActionTypes: [ActionType.BLOOD_GLUCOSE, ActionType.INSULIN],
        enabledAnalytics: {
          bloodGlucoseTrend: true,
          dailyGlucoseSummary: false,
          insulinVsGlucose: true,
          exerciseHydration: false,
          sleepGlucose: false,
          weightTrend: false,
          bloodPressureTrend: false,
          dailyBloodPressureSummary: false,
          bpVsGlucose: false,
          correlationAnalysis: false,
        },
      };

      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        preferences: existingPreferences,
      };

      const updatedPreferences = {
        ...existingPreferences,
        enabledAnalytics: {
          ...existingPreferences.enabledAnalytics,
          dailyGlucoseSummary: true,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        preferences: updatedPreferences,
      });

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: updatedPreferences,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.enabledAnalytics.dailyGlucoseSummary).toBe(true);
      expect(data.preferences.enabledActionTypes).toEqual([
        ActionType.BLOOD_GLUCOSE,
        ActionType.INSULIN,
      ]);
    });

    it('should return error when preferences has invalid action types', async () => {
      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: {
            enabledActionTypes: ['INVALID_TYPE', 'ANOTHER_INVALID'],
            enabledAnalytics: DEFAULT_PREFERENCES.enabledAnalytics,
          },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});

import { getServerSession } from 'next-auth/next';

import { PATCH, DELETE } from '../route';

import { ActionType } from '@/app/constants/action-types';
import { prisma } from '@/lib/prisma';

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

describe('/api/actions/[id]', () => {
  const mockUserId = 'user-123';
  const mockActionId = 'action-123';
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

  describe('PATCH', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid payload', async () => {
      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({ bloodGlucose: -10 }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid payload');
    });

    it('should return 404 if action not found', async () => {
      mockPrisma.action.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated notes' }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
      expect(mockPrisma.action.findFirst).toHaveBeenCalledWith({
        where: { id: mockActionId, userId: mockUserId },
      });
    });

    it('should return 404 if action belongs to different user', async () => {
      mockPrisma.action.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated notes' }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
    });

    it('should update action successfully', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.BLOOD_GLUCOSE,
        timestamp: new Date('2024-01-01'),
        bloodGlucose: 120,
        notes: 'Original notes',
      };

      const updatedAction = {
        ...existingAction,
        notes: 'Updated notes',
        bloodGlucose: 130,
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          notes: 'Updated notes',
          bloodGlucose: 130,
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(updatedAction.id);
      expect(data.notes).toBe(updatedAction.notes);
      expect(data.bloodGlucose).toBe(updatedAction.bloodGlucose);
      expect(data.timestamp).toBe(updatedAction.timestamp.toISOString());
      expect(mockPrisma.action.update).toHaveBeenCalledWith({
        where: { id: mockActionId },
        data: expect.objectContaining({
          timestamp: existingAction.timestamp,
          notes: 'Updated notes',
          bloodGlucose: 130,
        }),
      });
    });

    it('should update timestamp if provided', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.BLOOD_GLUCOSE,
        timestamp: new Date('2024-01-01'),
        bloodGlucose: 120,
      };

      const newTimestamp = '2024-01-02T10:00:00Z';
      const updatedAction = {
        ...existingAction,
        timestamp: new Date(newTimestamp),
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          timestamp: newTimestamp,
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(updatedAction.id);
      expect(data.bloodGlucose).toBe(updatedAction.bloodGlucose);
      expect(data.timestamp).toBe(updatedAction.timestamp.toISOString());
      expect(mockPrisma.action.update).toHaveBeenCalledWith({
        where: { id: mockActionId },
        data: expect.objectContaining({
          timestamp: new Date(newTimestamp),
        }),
      });
    });

    it('should handle partial updates preserving existing values', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.INSULIN,
        timestamp: new Date('2024-01-01'),
        insulinType: 'rapid-acting',
        insulinUnits: 10,
        notes: 'Original notes',
      };

      const updatedAction = {
        ...existingAction,
        notes: 'Updated notes',
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          notes: 'Updated notes',
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(updatedAction.id);
      expect(data.notes).toBe(updatedAction.notes);
      expect(data.insulinType).toBe(updatedAction.insulinType);
      expect(data.insulinUnits).toBe(updatedAction.insulinUnits);
      expect(data.timestamp).toBe(updatedAction.timestamp.toISOString());
      expect(mockPrisma.action.update).toHaveBeenCalledWith({
        where: { id: mockActionId },
        data: expect.objectContaining({
          notes: 'Updated notes',
          insulinType: 'rapid-acting',
          insulinUnits: 10,
        }),
      });
    });

    it('should update medication action', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.MEDICATION,
        timestamp: new Date('2024-01-01'),
        medicationName: 'Metformin',
        medicationDose: '500mg',
        notes: 'Original notes',
      };

      const updatedAction = {
        ...existingAction,
        medicationName: 'Aspirin',
        medicationDose: '100mg',
        notes: 'Updated notes',
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          medicationName: 'Aspirin',
          medicationDose: '100mg',
          notes: 'Updated notes',
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.medicationName).toBe('Aspirin');
      expect(data.medicationDose).toBe('100mg');
      expect(data.notes).toBe('Updated notes');
    });

    it('should update food action', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.FOOD,
        timestamp: new Date('2024-01-01'),
        foodDescription: 'Grilled chicken',
        notes: 'Original notes',
      };

      const updatedAction = {
        ...existingAction,
        foodDescription: 'Salad with dressing',
        notes: 'Updated notes',
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          foodDescription: 'Salad with dressing',
          notes: 'Updated notes',
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.foodDescription).toBe('Salad with dressing');
      expect(data.notes).toBe('Updated notes');
    });

    it('should update symptoms action', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.SYMPTOMS,
        timestamp: new Date('2024-01-01'),
        symptomDesc: 'Headache',
        symptomSeverity: 5,
        notes: 'Original notes',
      };

      const updatedAction = {
        ...existingAction,
        symptomDesc: 'Dizziness',
        symptomSeverity: 8,
        notes: 'Updated notes',
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          symptomDesc: 'Dizziness',
          symptomSeverity: 8,
          notes: 'Updated notes',
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.symptomDesc).toBe('Dizziness');
      expect(data.symptomSeverity).toBe(8);
      expect(data.notes).toBe('Updated notes');
    });

    it('should update weight action', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.WEIGHT,
        timestamp: new Date('2024-01-01'),
        weightValue: 75.0,
        weightUnit: 'kg',
        notes: 'Original notes',
      };

      const updatedAction = {
        ...existingAction,
        weightValue: 74.5,
        weightUnit: 'kg',
        notes: 'Updated notes',
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          weightValue: 74.5,
          notes: 'Updated notes',
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.weightValue).toBe(74.5);
      expect(data.weightUnit).toBe('kg');
      expect(data.notes).toBe('Updated notes');
    });

    it('should update hydration action', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.HYDRATION,
        timestamp: new Date('2024-01-01'),
        hydrationAmount: 500,
        notes: 'Original notes',
      };

      const updatedAction = {
        ...existingAction,
        hydrationAmount: 750,
        notes: 'Updated notes',
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          hydrationAmount: 750,
          notes: 'Updated notes',
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hydrationAmount).toBe(750);
      expect(data.notes).toBe('Updated notes');
    });

    it('should update multiple fields simultaneously', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.BLOOD_GLUCOSE,
        timestamp: new Date('2024-01-01'),
        bloodGlucose: 120,
        glucoseContext: 'fasting',
        notes: 'Original notes',
      };

      const updatedAction = {
        ...existingAction,
        bloodGlucose: 130,
        glucoseContext: 'post-meal',
        notes: 'Updated notes',
        timestamp: new Date('2024-01-02'),
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          bloodGlucose: 130,
          glucoseContext: 'post-meal',
          notes: 'Updated notes',
          timestamp: '2024-01-02T10:00:00Z',
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bloodGlucose).toBe(130);
      expect(data.glucoseContext).toBe('post-meal');
      expect(data.notes).toBe('Updated notes');
    });

    it('should handle null values for optional fields', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.BLOOD_GLUCOSE,
        timestamp: new Date('2024-01-01'),
        bloodGlucose: 120,
        glucoseContext: 'fasting',
        notes: 'Original notes',
      };

      const updatedAction = {
        ...existingAction,
        glucoseContext: null,
        notes: null,
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.update.mockResolvedValue(updatedAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          glucoseContext: null,
          notes: null,
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.glucoseContext).toBeNull();
      expect(data.notes).toBeNull();
    });

    it('should reject update of action belonging to different user', async () => {
      // Mock findFirst to return null because userId doesn't match
      mockPrisma.action.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          notes: 'Trying to update',
        }),
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
      expect(mockPrisma.action.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if action not found', async () => {
      mockPrisma.action.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
    });

    it('should delete action successfully', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.BLOOD_GLUCOSE,
        timestamp: new Date('2024-01-01'),
        bloodGlucose: 120,
      };

      mockPrisma.action.findFirst.mockResolvedValue(existingAction);
      mockPrisma.action.delete.mockResolvedValue(existingAction);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockPrisma.action.delete).toHaveBeenCalledWith({
        where: { id: mockActionId },
      });
    });

    it('should not delete action belonging to different user', async () => {
      mockPrisma.action.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/actions/123', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: mockActionId });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
      expect(mockPrisma.action.delete).not.toHaveBeenCalled();
    });
  });
});

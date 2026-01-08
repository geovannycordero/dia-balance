import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { ActionType } from '@/app/constants/action-types'
import { prisma } from '@/lib/prisma'

import { GET, POST } from '../route'

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

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
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as any

describe('/api/actions', () => {
  const mockUserId = 'user-123'
  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession as any)
  })

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 if user email is missing', async () => {
      mockGetServerSession.mockResolvedValue({ user: {} } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 if user id is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return actions for authenticated user', async () => {
      const mockActions = [
        {
          id: 'action-1',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01'),
          bloodGlucose: 120,
        },
        {
          id: 'action-2',
          userId: mockUserId,
          type: ActionType.INSULIN,
          timestamp: new Date('2024-01-02'),
          insulinUnits: 10,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].id).toBe('action-1')
      expect(data[0].timestamp).toBe(mockActions[0].timestamp.toISOString())
      expect(data[1].id).toBe('action-2')
      expect(data[1].timestamp).toBe(mockActions[1].timestamp.toISOString())
      expect(mockPrisma.action.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { timestamp: 'desc' },
        take: 200,
      })
    })
  })

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid payload', async () => {
      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify({ type: 'INVALID_TYPE' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
      expect(data.issues).toBeDefined()
    })

    it('should create blood glucose action', async () => {
      const payload = {
        type: ActionType.BLOOD_GLUCOSE,
        bloodGlucose: 120,
        glucoseContext: 'fasting',
        notes: 'Morning reading',
      }

      const createdAction = {
        id: 'action-1',
        userId: mockUserId,
        ...payload,
        timestamp: new Date(),
      }

      mockPrisma.action.create.mockResolvedValue(createdAction)

      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe(createdAction.id)
      expect(data.type).toBe(createdAction.type)
      expect(data.bloodGlucose).toBe(createdAction.bloodGlucose)
      expect(data.timestamp).toBe(createdAction.timestamp.toISOString())
      expect(mockPrisma.action.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          type: payload.type,
          timestamp: expect.any(Date),
          notes: payload.notes,
          bloodGlucose: payload.bloodGlucose,
          glucoseContext: payload.glucoseContext,
          insulinType: undefined,
          insulinUnits: undefined,
          medicationName: undefined,
          medicationDose: undefined,
          foodDescription: undefined,
          exerciseType: undefined,
          exerciseDuration: undefined,
          exerciseIntensity: undefined,
          sleepHours: undefined,
          sleepQuality: undefined,
          symptomDesc: undefined,
          symptomSeverity: undefined,
          weightValue: undefined,
          weightUnit: undefined,
          hydrationAmount: undefined,
          bloodPressureSystolic: undefined,
          bloodPressureDiastolic: undefined,
        },
      })
    })

    it('should create insulin action', async () => {
      const payload = {
        type: ActionType.INSULIN,
        insulinType: 'rapid-acting',
        insulinUnits: 10,
        timestamp: '2024-01-01T10:00:00Z',
      }

      const createdAction = {
        id: 'action-2',
        userId: mockUserId,
        ...payload,
        timestamp: new Date(payload.timestamp),
      }

      mockPrisma.action.create.mockResolvedValue(createdAction)

      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe(createdAction.id)
      expect(data.type).toBe(createdAction.type)
      expect(data.insulinUnits).toBe(createdAction.insulinUnits)
      expect(data.timestamp).toBe(createdAction.timestamp.toISOString())
      expect(mockPrisma.action.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          type: payload.type,
          timestamp: new Date(payload.timestamp),
          notes: undefined,
          bloodGlucose: undefined,
          glucoseContext: undefined,
          insulinType: payload.insulinType,
          insulinUnits: payload.insulinUnits,
          medicationName: undefined,
          medicationDose: undefined,
          foodDescription: undefined,
          exerciseType: undefined,
          exerciseDuration: undefined,
          exerciseIntensity: undefined,
          sleepHours: undefined,
          sleepQuality: undefined,
          symptomDesc: undefined,
          symptomSeverity: undefined,
          weightValue: undefined,
          weightUnit: undefined,
          hydrationAmount: undefined,
          bloodPressureSystolic: undefined,
          bloodPressureDiastolic: undefined,
        },
      })
    })

    it('should create exercise action', async () => {
      const payload = {
        type: ActionType.EXERCISE,
        exerciseType: 'running',
        exerciseDuration: 30,
        exerciseIntensity: 'moderate',
      }

      const createdAction = {
        id: 'action-3',
        userId: mockUserId,
        ...payload,
        timestamp: new Date(),
      }

      mockPrisma.action.create.mockResolvedValue(createdAction)

      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe(createdAction.id)
      expect(data.type).toBe(createdAction.type)
      expect(data.exerciseDuration).toBe(createdAction.exerciseDuration)
      expect(data.timestamp).toBe(createdAction.timestamp.toISOString())
    })

    it('should create sleep action', async () => {
      const payload = {
        type: ActionType.SLEEP,
        sleepHours: 8,
        sleepQuality: 4,
      }

      const createdAction = {
        id: 'action-4',
        userId: mockUserId,
        ...payload,
        timestamp: new Date(),
      }

      mockPrisma.action.create.mockResolvedValue(createdAction)

      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe(createdAction.id)
      expect(data.type).toBe(createdAction.type)
      expect(data.sleepHours).toBe(createdAction.sleepHours)
      expect(data.timestamp).toBe(createdAction.timestamp.toISOString())
    })

    it('should create blood pressure action', async () => {
      const payload = {
        type: ActionType.BLOOD_PRESSURE,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
      }

      const createdAction = {
        id: 'action-5',
        userId: mockUserId,
        ...payload,
        timestamp: new Date(),
      }

      mockPrisma.action.create.mockResolvedValue(createdAction)

      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe(createdAction.id)
      expect(data.type).toBe(createdAction.type)
      expect(data.bloodPressureSystolic).toBe(createdAction.bloodPressureSystolic)
      expect(data.timestamp).toBe(createdAction.timestamp.toISOString())
    })

    it('should use current timestamp if not provided', async () => {
      const payload = {
        type: ActionType.BLOOD_GLUCOSE,
        bloodGlucose: 120,
      }

      const beforeTime = new Date()
      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      await POST(request)

      const afterTime = new Date()
      const callData = mockPrisma.action.create.mock.calls[0][0].data
      const timestamp = callData.timestamp

      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })
  })
})


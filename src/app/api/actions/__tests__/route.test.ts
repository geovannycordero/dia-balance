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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetServerSession.mockResolvedValue({ user: {} } as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 if user id is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    it('should return empty array when no actions exist', async () => {
      mockPrisma.action.findMany.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(0)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should respect limit of 200 actions', async () => {
      const mockActions = Array.from({ length: 200 }, (_, i) => ({
        id: `action-${i}`,
        userId: mockUserId,
        type: ActionType.BLOOD_GLUCOSE,
        timestamp: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        bloodGlucose: 120,
      }))

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(200)
      expect(mockPrisma.action.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { timestamp: 'desc' },
        take: 200,
      })
    })

    it('should order actions by timestamp descending', async () => {
      const mockActions = [
        {
          id: 'action-1',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-03'),
          bloodGlucose: 120,
        },
        {
          id: 'action-2',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01'),
          bloodGlucose: 110,
        },
        {
          id: 'action-3',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-02'),
          bloodGlucose: 115,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const response = await GET()
      // const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.action.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { timestamp: 'desc' },
        take: 200,
      })
    })

    it('should filter actions by authenticated user only', async () => {
      const mockActions = [
        {
          id: 'action-1',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01'),
          bloodGlucose: 120,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      await GET()

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

    it('should create medication action', async () => {
      const payload = {
        type: ActionType.MEDICATION,
        medicationName: 'Metformin',
        medicationDose: '500mg',
        notes: 'Morning dose',
      }

      const createdAction = {
        id: 'action-med',
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
      expect(data.medicationName).toBe(createdAction.medicationName)
      expect(data.medicationDose).toBe(createdAction.medicationDose)
    })

    it('should create food action', async () => {
      const payload = {
        type: ActionType.FOOD,
        foodDescription: 'Grilled chicken with vegetables',
        notes: 'Lunch',
      }

      const createdAction = {
        id: 'action-food',
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
      expect(data.foodDescription).toBe(createdAction.foodDescription)
    })

    it('should create symptoms action', async () => {
      const payload = {
        type: ActionType.SYMPTOMS,
        symptomDesc: 'Headache',
        symptomSeverity: 7,
        notes: 'Persistent headache',
      }

      const createdAction = {
        id: 'action-symptoms',
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
      expect(data.symptomDesc).toBe(createdAction.symptomDesc)
      expect(data.symptomSeverity).toBe(createdAction.symptomSeverity)
    })

    it('should create weight action', async () => {
      const payload = {
        type: ActionType.WEIGHT,
        weightValue: 75.5,
        weightUnit: 'kg',
        notes: 'Morning weight',
      }

      const createdAction = {
        id: 'action-weight',
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
      expect(data.weightValue).toBe(createdAction.weightValue)
      expect(data.weightUnit).toBe(createdAction.weightUnit)
    })

    it('should create hydration action', async () => {
      const payload = {
        type: ActionType.HYDRATION,
        hydrationAmount: 500,
        notes: 'Water intake',
      }

      const createdAction = {
        id: 'action-hydration',
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
      expect(data.hydrationAmount).toBe(createdAction.hydrationAmount)
    })

    it('should handle optional fields correctly', async () => {
      const payload = {
        type: ActionType.BLOOD_GLUCOSE,
        bloodGlucose: 120,
        notes: 'Optional notes',
        timestamp: '2024-01-01T10:00:00Z',
      }

      const createdAction = {
        id: 'action-optional',
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
      expect(data.notes).toBe(payload.notes)
      expect(data.timestamp).toBe(new Date(payload.timestamp).toISOString())
    })

    it('should reject invalid blood glucose value', async () => {
      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify({
          type: ActionType.BLOOD_GLUCOSE,
          bloodGlucose: -10,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
    })

    it('should reject empty string for required fields', async () => {
      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify({
          type: ActionType.MEDICATION,
          medicationName: '',
          medicationDose: '500mg',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
    })

    it('should reject missing required fields for action type', async () => {
      const request = new Request('http://localhost/api/actions', {
        method: 'POST',
        body: JSON.stringify({
          type: ActionType.INSULIN,
          // Missing insulinType and insulinUnits
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
    })
  })
})


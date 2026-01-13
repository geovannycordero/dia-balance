import { getServerSession } from 'next-auth/next'

import { ActionType } from '@/app/constants/action-types'
import { prisma } from '@/lib/prisma'

import { GET } from '../route'

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

jest.mock('@/lib/date-utils', () => ({
  dateStringToUTC: jest.fn((dateString: string) => {
    return new Date(dateString + 'T00:00:00')
  }),
  dateStringToUTCEndOfDay: jest.fn((dateString: string) => {
    return new Date(dateString + 'T23:59:59.999')
  }),
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any

describe('/api/analytics', () => {
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

      const request = new Request('http://localhost/api/analytics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 if user id is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const request = new Request('http://localhost/api/analytics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should use default date range (last 7 days) when no params provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockActions: any[] = []
      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics')
      await GET(request)

      expect(mockPrisma.action.findMany).toHaveBeenCalled()
      const callArgs = mockPrisma.action.findMany.mock.calls[0][0]
      expect(callArgs.where.userId).toBe(mockUserId)
      expect(callArgs.where.timestamp.gte).toBeInstanceOf(Date)
      expect(callArgs.where.timestamp.lte).toBeInstanceOf(Date)
    })

    it('should use custom date range when from and to params provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockActions: any[] = []
      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-07')
      await GET(request)

      expect(mockPrisma.action.findMany).toHaveBeenCalled()
      const callArgs = mockPrisma.action.findMany.mock.calls[0][0]
      expect(callArgs.where.timestamp.gte).toBeInstanceOf(Date)
      expect(callArgs.where.timestamp.lte).toBeInstanceOf(Date)
    })

    it('should return analytics data with blood glucose readings', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodGlucose: 120,
          glucoseContext: 'fasting',
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          bloodGlucose: 140,
          glucoseContext: 'post-meal',
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bloodGlucose).toHaveLength(2)
      expect(data.bloodGlucose[0]).toEqual({
        timestamp: mockActions[0].timestamp.toISOString(),
        value: 120,
        context: 'fasting',
      })
      expect(data.bloodGlucose[1]).toEqual({
        timestamp: mockActions[1].timestamp.toISOString(),
        value: 140,
        context: 'post-meal',
      })
    })

    it('should return analytics data with insulin entries', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.INSULIN,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          insulinUnits: 10,
          insulinType: 'rapid-acting',
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.insulin).toHaveLength(1)
      expect(data.insulin[0]).toEqual({
        timestamp: mockActions[0].timestamp.toISOString(),
        units: 10,
        insulinType: 'rapid-acting',
      })
    })

    it('should return analytics data with exercise entries', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.EXERCISE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          exerciseType: 'running',
          exerciseDuration: 30,
          exerciseIntensity: 'moderate',
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.exercise).toHaveLength(1)
      expect(data.exercise[0]).toEqual({
        timestamp: mockActions[0].timestamp.toISOString(),
        type: 'running',
        duration: 30,
        intensity: 'moderate',
      })
    })

    it('should return analytics data with sleep entries', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.SLEEP,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          sleepHours: 8,
          sleepQuality: 4,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sleep).toHaveLength(1)
      expect(data.sleep[0]).toEqual({
        timestamp: mockActions[0].timestamp.toISOString(),
        hours: 8,
        quality: 4,
      })
    })

    it('should return analytics data with weight entries', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.WEIGHT,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          weightValue: 70,
          weightUnit: 'kg',
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.weight).toHaveLength(1)
      expect(data.weight[0]).toEqual({
        timestamp: mockActions[0].timestamp.toISOString(),
        value: 70,
        unit: 'kg',
      })
    })

    it('should return analytics data with hydration entries', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.HYDRATION,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          hydrationAmount: 500,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hydration).toHaveLength(1)
      expect(data.hydration[0]).toEqual({
        timestamp: mockActions[0].timestamp.toISOString(),
        amount: 500,
      })
    })

    it('should return analytics data with blood pressure entries', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bloodPressure).toHaveLength(1)
      expect(data.bloodPressure[0]).toEqual({
        timestamp: mockActions[0].timestamp.toISOString(),
        systolic: 120,
        diastolic: 80,
        category: 'hypertension-stage-1', // per app logic: diastolic >= 80 is classified as stage-1 (120/80 is a clinical boundary case)
      })
    })

    it('should categorize blood pressure correctly', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodPressureSystolic: 140,
          bloodPressureDiastolic: 90,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T11:00:00Z'),
          bloodPressureSystolic: 181,
          bloodPressureDiastolic: 121,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bloodPressure[0].category).toBe('hypertension-stage-2')
      expect(data.bloodPressure[1].category).toBe('crisis')
    })

    it('should calculate daily glucose summary', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodGlucose: 100,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          bloodGlucose: 120,
        },
        {
          id: '3',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T18:00:00Z'),
          bloodGlucose: 140,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.dailyGlucoseSummary).toBeDefined()
      expect(data.dailyGlucoseSummary.length).toBeGreaterThan(0)
      const summary = data.dailyGlucoseSummary[0]
      expect(summary.avg).toBe(120)
      expect(summary.min).toBe(100)
      expect(summary.max).toBe(140)
      expect(summary.count).toBe(3)
    })

    it('should calculate daily blood pressure summary', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          bloodPressureSystolic: 130,
          bloodPressureDiastolic: 85,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.dailyBloodPressureSummary).toBeDefined()
      expect(data.dailyBloodPressureSummary.length).toBeGreaterThan(0)
      const summary = data.dailyBloodPressureSummary[0]
      expect(summary.systolicAvg).toBe(125)
      expect(summary.diastolicAvg).toBe(82.5)
    })

    it('should calculate hydration by day', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.HYDRATION,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          hydrationAmount: 500,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.HYDRATION,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          hydrationAmount: 300,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hydrationByDay).toBeDefined()
      expect(data.hydrationByDay.length).toBeGreaterThan(0)
      expect(data.hydrationByDay[0].total).toBe(800)
    })

    it('should calculate BP-glucose correlation when enough data points', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T10:15:00Z'),
          bloodGlucose: 100,
        },
        {
          id: '3',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          bloodPressureSystolic: 130,
          bloodPressureDiastolic: 85,
        },
        {
          id: '4',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T14:15:00Z'),
          bloodGlucose: 120,
        },
        {
          id: '5',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T18:00:00Z'),
          bloodPressureSystolic: 125,
          bloodPressureDiastolic: 82,
        },
        {
          id: '6',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T18:15:00Z'),
          bloodGlucose: 110,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bpGlucoseCorrelation).toBeDefined()
      expect(data.bpGlucoseCorrelation).not.toBeNull()
      expect(data.bpGlucoseCorrelation?.coefficient).toBeDefined()
      expect(data.bpGlucoseCorrelation?.strength).toBeDefined()
      expect(data.bpGlucoseCorrelation?.direction).toBeDefined()
    })

    it('should return null correlation when insufficient data', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bpGlucoseCorrelation).toBeNull()
    })

    it('should generate insights', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodGlucose: 120,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.EXERCISE,
          timestamp: new Date('2024-01-01T11:00:00Z'),
          exerciseType: 'running',
          exerciseDuration: 30,
          exerciseIntensity: 'moderate',
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.insights).toBeDefined()
      expect(Array.isArray(data.insights)).toBe(true)
      expect(data.insights.length).toBeGreaterThan(0)
    })

    it('should filter out actions with null values', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodGlucose: null,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          bloodGlucose: 120,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bloodGlucose).toHaveLength(1)
      expect(data.bloodGlucose[0].value).toBe(120)
    })

    it('should return medication count', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.MEDICATION,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          medicationName: 'Metformin',
          medicationDose: '500mg',
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.MEDICATION,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          medicationName: 'Aspirin',
          medicationDose: '100mg',
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.insights).toBeDefined()
      const medicationInsight = data.insights.find((insight: string) =>
        insight.includes('Medication entries'),
      )
      expect(medicationInsight).toBeDefined()
    })

    it('should return correct structure when no data exists', async () => {
      mockPrisma.action.findMany.mockResolvedValue([])

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bloodGlucose).toEqual([])
      expect(data.insulin).toEqual([])
      expect(data.exercise).toEqual([])
      expect(data.sleep).toEqual([])
      expect(data.weight).toEqual([])
      expect(data.hydration).toEqual([])
      expect(data.bloodPressure).toEqual([])
      expect(data.dailyGlucoseSummary).toEqual([])
      expect(data.dailyBloodPressureSummary).toEqual([])
      expect(data.hydrationByDay).toEqual([])
      expect(data.weightTrend).toEqual([])
      expect(data.bpGlucoseCorrelation).toBeNull()
      expect(Array.isArray(data.insights)).toBe(true)
    })

    it('should handle invalid date parameters gracefully', async () => {
      mockPrisma.action.findMany.mockResolvedValue([])

      const request = new Request(
        'http://localhost/api/analytics?from=invalid-date&to=also-invalid',
      )
      const response = await GET(request)

      // Should still return 200 but use default date range
      expect(response.status).toBe(200)
      expect(mockPrisma.action.findMany).toHaveBeenCalled()
    })

    it('should calculate correlation with minimum data points', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T10:15:00Z'),
          bloodGlucose: 100,
        },
        {
          id: '3',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          bloodPressureSystolic: 130,
          bloodPressureDiastolic: 85,
        },
        {
          id: '4',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T14:15:00Z'),
          bloodGlucose: 120,
        },
        {
          id: '5',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T18:00:00Z'),
          bloodPressureSystolic: 125,
          bloodPressureDiastolic: 82,
        },
        {
          id: '6',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T18:15:00Z'),
          bloodGlucose: 110,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bpGlucoseCorrelation).toBeDefined()
      expect(data.bpGlucoseCorrelation).not.toBeNull()
      expect(data.bpGlucoseCorrelation?.coefficient).toBeDefined()
      expect(data.bpGlucoseCorrelation?.strength).toBeDefined()
      expect(data.bpGlucoseCorrelation?.direction).toBeDefined()
    })

    it('should categorize blood pressure correctly in all ranges', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodPressureSystolic: 110,
          bloodPressureDiastolic: 70,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T11:00:00Z'),
          bloodPressureSystolic: 125,
          bloodPressureDiastolic: 75,
        },
        {
          id: '3',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T12:00:00Z'),
          bloodPressureSystolic: 135,
          bloodPressureDiastolic: 85,
        },
        {
          id: '4',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T13:00:00Z'),
          bloodPressureSystolic: 145,
          bloodPressureDiastolic: 95,
        },
        {
          id: '5',
          userId: mockUserId,
          type: ActionType.BLOOD_PRESSURE,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          bloodPressureSystolic: 185,
          bloodPressureDiastolic: 125,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bloodPressure).toHaveLength(5)
      expect(data.bloodPressure[0].category).toBe('normal')
      expect(data.bloodPressure[1].category).toBe('elevated')
      expect(data.bloodPressure[2].category).toBe('hypertension-stage-1')
      expect(data.bloodPressure[3].category).toBe('hypertension-stage-2')
      expect(data.bloodPressure[4].category).toBe('crisis')
    })

    it('should calculate daily summaries correctly with multiple days', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodGlucose: 100,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T14:00:00Z'),
          bloodGlucose: 120,
        },
        {
          id: '3',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-02T10:00:00Z'),
          bloodGlucose: 110,
        },
        {
          id: '4',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-02T14:00:00Z'),
          bloodGlucose: 130,
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-02')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.dailyGlucoseSummary).toBeDefined()
      expect(data.dailyGlucoseSummary.length).toBe(2)
      expect(data.dailyGlucoseSummary[0].count).toBe(2)
      expect(data.dailyGlucoseSummary[0].avg).toBe(110)
      expect(data.dailyGlucoseSummary[1].count).toBe(2)
      expect(data.dailyGlucoseSummary[1].avg).toBe(120)
    })

    it('should generate insights correctly with different data combinations', async () => {
      const mockActions = [
        {
          id: '1',
          userId: mockUserId,
          type: ActionType.BLOOD_GLUCOSE,
          timestamp: new Date('2024-01-01T10:00:00Z'),
          bloodGlucose: 120,
        },
        {
          id: '2',
          userId: mockUserId,
          type: ActionType.EXERCISE,
          timestamp: new Date('2024-01-01T11:00:00Z'),
          exerciseType: 'running',
          exerciseDuration: 30,
          exerciseIntensity: 'moderate',
        },
        {
          id: '3',
          userId: mockUserId,
          type: ActionType.WEIGHT,
          timestamp: new Date('2024-01-01T12:00:00Z'),
          weightValue: 75.0,
          weightUnit: 'kg',
        },
        {
          id: '4',
          userId: mockUserId,
          type: ActionType.WEIGHT,
          timestamp: new Date('2024-01-07T12:00:00Z'),
          weightValue: 74.0,
          weightUnit: 'kg',
        },
      ]

      mockPrisma.action.findMany.mockResolvedValue(mockActions)

      const request = new Request('http://localhost/api/analytics?from=2024-01-01&to=2024-01-07')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.insights).toBeDefined()
      expect(Array.isArray(data.insights)).toBe(true)
      expect(data.insights.length).toBeGreaterThan(0)
      // Should have insight about exercise and glucose
      const exerciseInsight = data.insights.find((insight: string) =>
        insight.includes('exercise'),
      )
      expect(exerciseInsight).toBeDefined()
      // Should have insight about weight change
      const weightInsight = data.insights.find((insight: string) => insight.includes('weight'))
      expect(weightInsight).toBeDefined()
    })
  })
})


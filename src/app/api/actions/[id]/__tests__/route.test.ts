import { getServerSession } from 'next-auth/next'

import { ActionType } from '@/app/constants/action-types'
import { prisma } from '@/lib/prisma'

import { PATCH, DELETE } from '../route'

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

describe('/api/actions/[id]', () => {
  const mockUserId = 'user-123'
  const mockActionId = 'action-123'
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

  describe('PATCH', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({}),
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid payload', async () => {
      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({ bloodGlucose: -10 }),
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid payload')
    })

    it('should return 404 if action not found', async () => {
      mockPrisma.action.findFirst.mockResolvedValue(null)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated notes' }),
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Not found')
      expect(mockPrisma.action.findFirst).toHaveBeenCalledWith({
        where: { id: mockActionId, userId: mockUserId },
      })
    })

    it('should return 404 if action belongs to different user', async () => {
      mockPrisma.action.findFirst.mockResolvedValue(null)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated notes' }),
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Not found')
    })

    it('should update action successfully', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.BLOOD_GLUCOSE,
        timestamp: new Date('2024-01-01'),
        bloodGlucose: 120,
        notes: 'Original notes',
      }

      const updatedAction = {
        ...existingAction,
        notes: 'Updated notes',
        bloodGlucose: 130,
      }

      mockPrisma.action.findFirst.mockResolvedValue(existingAction)
      mockPrisma.action.update.mockResolvedValue(updatedAction)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          notes: 'Updated notes',
          bloodGlucose: 130,
        }),
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(updatedAction.id)
      expect(data.notes).toBe(updatedAction.notes)
      expect(data.bloodGlucose).toBe(updatedAction.bloodGlucose)
      expect(data.timestamp).toBe(updatedAction.timestamp.toISOString())
      expect(mockPrisma.action.update).toHaveBeenCalledWith({
        where: { id: mockActionId },
        data: expect.objectContaining({
          timestamp: existingAction.timestamp,
          notes: 'Updated notes',
          bloodGlucose: 130,
        }),
      })
    })

    it('should update timestamp if provided', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.BLOOD_GLUCOSE,
        timestamp: new Date('2024-01-01'),
        bloodGlucose: 120,
      }

      const newTimestamp = '2024-01-02T10:00:00Z'
      const updatedAction = {
        ...existingAction,
        timestamp: new Date(newTimestamp),
      }

      mockPrisma.action.findFirst.mockResolvedValue(existingAction)
      mockPrisma.action.update.mockResolvedValue(updatedAction)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          timestamp: newTimestamp,
        }),
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(updatedAction.id)
      expect(data.notes).toBe(updatedAction.notes)
      expect(data.bloodGlucose).toBe(updatedAction.bloodGlucose)
      expect(data.timestamp).toBe(updatedAction.timestamp.toISOString())
      expect(mockPrisma.action.update).toHaveBeenCalledWith({
        where: { id: mockActionId },
        data: expect.objectContaining({
          timestamp: new Date(newTimestamp),
        }),
      })
    })

    it('should handle partial updates preserving existing values', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.INSULIN,
        timestamp: new Date('2024-01-01'),
        insulinType: 'rapid-acting',
        insulinUnits: 10,
        notes: 'Original notes',
      }

      const updatedAction = {
        ...existingAction,
        notes: 'Updated notes',
      }

      mockPrisma.action.findFirst.mockResolvedValue(existingAction)
      mockPrisma.action.update.mockResolvedValue(updatedAction)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'PATCH',
        body: JSON.stringify({
          notes: 'Updated notes',
        }),
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await PATCH(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(updatedAction.id)
      expect(data.notes).toBe(updatedAction.notes)
      expect(data.insulinType).toBe(updatedAction.insulinType)
      expect(data.insulinUnits).toBe(updatedAction.insulinUnits)
      expect(data.timestamp).toBe(updatedAction.timestamp.toISOString())
      expect(mockPrisma.action.update).toHaveBeenCalledWith({
        where: { id: mockActionId },
        data: expect.objectContaining({
          notes: 'Updated notes',
          insulinType: 'rapid-acting',
          insulinUnits: 10,
        }),
      })
    })
  })

  describe('DELETE', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 if action not found', async () => {
      mockPrisma.action.findFirst.mockResolvedValue(null)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Not found')
    })

    it('should delete action successfully', async () => {
      const existingAction = {
        id: mockActionId,
        userId: mockUserId,
        type: ActionType.BLOOD_GLUCOSE,
        timestamp: new Date('2024-01-01'),
        bloodGlucose: 120,
      }

      mockPrisma.action.findFirst.mockResolvedValue(existingAction)
      mockPrisma.action.delete.mockResolvedValue(existingAction)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(mockPrisma.action.delete).toHaveBeenCalledWith({
        where: { id: mockActionId },
      })
    })

    it('should not delete action belonging to different user', async () => {
      mockPrisma.action.findFirst.mockResolvedValue(null)

      const request = new Request('http://localhost/api/actions/123', {
        method: 'DELETE',
      })

      const params = Promise.resolve({ id: mockActionId })
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Not found')
      expect(mockPrisma.action.delete).not.toHaveBeenCalled()
    })
  })
})


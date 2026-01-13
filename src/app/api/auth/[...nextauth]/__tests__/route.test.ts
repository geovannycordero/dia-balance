jest.mock('next-auth/next', () => ({
  __esModule: true,
  default: jest.fn(() => {
    const handler = jest.fn()
    return handler
  }),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

describe('/api/auth/[...nextauth]', () => {
  // Mock the route module after mocking NextAuth
  let GET: unknown
  let POST: unknown

  beforeAll(async () => {
    const routeModule = await import('../route')
    GET = routeModule.GET
    POST = routeModule.POST
  })

  describe('handler exports', () => {
    it('should export GET handler', () => {
      expect(GET).toBeDefined()
      expect(typeof GET).toBe('function')
    })

    it('should export POST handler', () => {
      expect(POST).toBeDefined()
      expect(typeof POST).toBe('function')
    })

    it('should have GET and POST as the same handler', () => {
      // NextAuth exports the same handler for both GET and POST
      expect(GET).toBe(POST)
    })
  })
})

import { getServerSession } from 'next-auth/next';

import { POST } from '../route';

import { buildFoodImageKey, getUploadUrl } from '@/lib/r2';

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/r2', () => ({
  buildFoodImageKey: jest.fn(),
  getUploadUrl: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockBuildFoodImageKey = buildFoodImageKey as jest.MockedFunction<typeof buildFoodImageKey>;
const mockGetUploadUrl = getUploadUrl as jest.MockedFunction<typeof getUploadUrl>;

describe('/api/actions/upload-url', () => {
  const mockUserId = 'user-123';
  const mockSession = {
    user: { id: mockUserId, email: 'test@example.com' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetServerSession.mockResolvedValue(mockSession as any);
    mockBuildFoodImageKey.mockReturnValue(`food/${mockUserId}/generated-key.jpg`);
    mockGetUploadUrl.mockResolvedValue('https://signed.example.com/upload');
  });

  it('returns 401 if user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request('http://localhost/api/actions/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType: 'image/jpeg' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when contentType is missing', async () => {
    const request = new Request('http://localhost/api/actions/upload-url', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid content type');
  });

  it('returns 400 when contentType is not an allowed image type', async () => {
    const request = new Request('http://localhost/api/actions/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType: 'application/pdf' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid content type');
  });

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ])('returns a signed upload URL and key for %s', async (contentType, extension) => {
    const request = new Request('http://localhost/api/actions/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploadUrl).toBe('https://signed.example.com/upload');
    expect(data.key).toBe(`food/${mockUserId}/generated-key.jpg`);
    expect(mockBuildFoodImageKey).toHaveBeenCalledWith(mockUserId, extension);
    expect(mockGetUploadUrl).toHaveBeenCalledWith(
      `food/${mockUserId}/generated-key.jpg`,
      contentType,
    );
  });
});

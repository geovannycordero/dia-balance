import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { buildFoodImageKey, getUploadUrl, getViewUrl, deleteObject, isOwnedFoodImageKey } from '../r2';

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example.com/url'),
}));

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;
const mockClientInstance = (S3Client as unknown as jest.Mock).mock.results[0].value as {
  send: jest.Mock;
};

describe('lib/r2', () => {
  beforeEach(() => {
    mockClientInstance.send.mockClear().mockResolvedValue({});
    mockGetSignedUrl.mockClear();
  });

  describe('buildFoodImageKey', () => {
    it('returns a key scoped under the user id with the given extension', () => {
      const key = buildFoodImageKey('user-123', 'jpg');

      expect(key).toMatch(
        /^food\/user-123\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
      );
    });

    it('produces a different key on each call', () => {
      expect(buildFoodImageKey('user-123', 'jpg')).not.toBe(buildFoodImageKey('user-123', 'jpg'));
    });
  });

  describe('isOwnedFoodImageKey', () => {
    it('accepts a key scoped under the given user id', () => {
      expect(isOwnedFoodImageKey('food/user-123/abc.jpg', 'user-123')).toBe(true);
    });

    it('rejects a key scoped under a different user id', () => {
      expect(isOwnedFoodImageKey('food/user-456/abc.jpg', 'user-123')).toBe(false);
    });

    it('rejects a key that only has the user id as a prefix, not a path segment', () => {
      expect(isOwnedFoodImageKey('food/user-123-evil/abc.jpg', 'user-123')).toBe(false);
    });

    it('rejects a key outside the food/ prefix entirely', () => {
      expect(isOwnedFoodImageKey('other/user-123/abc.jpg', 'user-123')).toBe(false);
    });
  });

  describe('getUploadUrl', () => {
    it('signs a short-lived PutObjectCommand for the given key and content type', async () => {
      const url = await getUploadUrl('food/user-123/abc.jpg', 'image/jpeg');

      expect(url).toBe('https://signed.example.com/url');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(PutObjectCommand),
        expect.objectContaining({ expiresIn: 300 }),
      );
    });
  });

  describe('getViewUrl', () => {
    it('signs a GetObjectCommand for the given key', async () => {
      const url = await getViewUrl('food/user-123/abc.jpg');

      expect(url).toBe('https://signed.example.com/url');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        expect.objectContaining({ expiresIn: 3600 }),
      );
    });
  });

  describe('deleteObject', () => {
    it('sends a DeleteObjectCommand for the given key', async () => {
      await deleteObject('food/user-123/abc.jpg');

      expect(mockClientInstance.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('swallows errors instead of throwing', async () => {
      mockClientInstance.send.mockRejectedValueOnce(new Error('boom'));

      await expect(deleteObject('food/user-123/abc.jpg')).resolves.toBeUndefined();
    });
  });
});

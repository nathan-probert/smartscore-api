import { describe, it, expect, vi } from 'vitest';
import { getAuthToken, requireAuth, unauthorized } from '../auth';

// Mock the cloudflare:workers module
vi.mock('cloudflare:workers', () => ({
  env: {
    API_AUTH_TOKEN: 'test-secret-token',
  },
}));

describe('Auth', () => {
  describe('getAuthToken', () => {
    it('should return null when no Authorization header is present', () => {
      const req = new Request('https://example.com', {
        headers: {},
      });
      expect(getAuthToken(req)).toBeNull();
    });

    it('should extract token from Bearer Authorization header', () => {
      const req = new Request('https://example.com', {
        headers: {
          Authorization: 'Bearer my-token-123',
        },
      });
      expect(getAuthToken(req)).toBe('my-token-123');
    });

    it('should return token as-is if no Bearer prefix', () => {
      const req = new Request('https://example.com', {
        headers: {
          Authorization: 'simple-token',
        },
      });
      expect(getAuthToken(req)).toBe('simple-token');
    });
  });

  describe('requireAuth', () => {
    it('should return false when no Authorization header is present', () => {
      const req = new Request('https://example.com', {
        headers: {},
      });
      expect(requireAuth(req)).toBe(false);
    });

    it('should return false when token does not match', () => {
      const req = new Request('https://example.com', {
        headers: {
          Authorization: 'Bearer wrong-token',
        },
      });
      expect(requireAuth(req)).toBe(false);
    });

    it('should return true when token matches', () => {
      const req = new Request('https://example.com', {
        headers: {
          Authorization: 'Bearer test-secret-token',
        },
      });
      expect(requireAuth(req)).toBe(true);
    });
  });

  describe('unauthorized', () => {
    const getCorsHeaders = (origin: string | null) => ({
      'Access-Control-Allow-Origin': origin || '*',
    });

    it('should return 401 response with CORS headers', async () => {
      const response = unauthorized('https://example.com', getCorsHeaders);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });
  });
});

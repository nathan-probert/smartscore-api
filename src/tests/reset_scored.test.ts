import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetScoredHandler } from '../handlers/reset_scored';
import type { Env } from '../env';
import * as mongodb from '../shared/mongodb';

// Mock the MongoDB utilities
vi.mock('../shared/mongodb', () => ({
  withMongoClient: vi.fn(),
  getPlayersCollection: vi.fn(),
}));

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
});

const mockEnv: Env = {
  API_AUTH_TOKEN: 'test-token',
  SHARED_SECRET: 'test-secret',
  MONGODB_URI: 'mongodb://localhost:27017',
  MONGODB_DATABASE: 'test-db',
};

interface ErrorResponse {
  error: string;
  details?: string;
}

interface SuccessResponse {
  date: string;
  matchedCount: number;
  modifiedCount: number;
  message: string;
}

describe('resetScoredHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request body validation', () => {
    it('should return 400 when request body is not valid JSON', async () => {
      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Invalid JSON in request body');
    });

    it('should return 400 when date field is missing', async () => {
      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Date field is required');
    });

    it('should return 400 when date format is invalid', async () => {
      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-1-5' }),
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Invalid date format. Expected YYYY-MM-DD');
    });
  });

  describe('Successful requests', () => {
    it('should reset scored status for valid request', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ matchedCount: 25, modifiedCount: 20 });

      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-15' }),
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.status).toBe(200);

      const body = await response.json() as SuccessResponse;
      expect(body.date).toBe('2026-01-15');
      expect(body.matchedCount).toBe(25);
      expect(body.modifiedCount).toBe(20);
      expect(body.message).toContain('2026-01-15');
    });

    it('should handle zero matches', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-12-31' }),
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.status).toBe(200);

      const body = await response.json() as SuccessResponse;
      expect(body.matchedCount).toBe(0);
      expect(body.modifiedCount).toBe(0);
    });

    it('should include correct Content-Type header', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ matchedCount: 5, modifiedCount: 5 });

      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05' }),
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in response', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ matchedCount: 10, modifiedCount: 8 });

      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-20' }),
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,DELETE,OPTIONS');
    });

    it('should include CORS headers in error response', async () => {
      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-1-5' }),
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Error handling', () => {
    it('should handle MongoDB errors', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Connection failed'));

      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05' }),
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.status).toBe(500);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Failed to reset scored status');
      expect(body.details).toBe('Connection failed');
    });

    it('should handle unknown errors', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue('Unknown error');

      const request = new Request('https://api.example.com/reset-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05' }),
      });
      const response = await resetScoredHandler(request, mockEnv, null, getCorsHeaders);

      expect(response.status).toBe(500);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Failed to reset scored status');
      expect(body.details).toBe('Unknown error');
    });
  });
});

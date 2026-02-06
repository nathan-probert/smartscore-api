import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backfillScoredHandler } from '../handlers/backfill_scored';
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
  scoredPlayerIds: string[];
  scoredCount: number;
  unscoredCount: number;
  message: string;
}

describe('backfillScoredHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request body validation', () => {
    it('should return 400 when request body is not valid JSON', async () => {
      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Invalid JSON in request body');
    });

    it('should return 400 when date field is missing', async () => {
      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ scoredPlayerIds: ['player1', 'player2'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Date field is required');
    });

    it('should return 400 when scoredPlayerIds field is missing', async () => {
      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05' }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('scoredPlayerIds field is required and must be an array');
    });

    it('should return 400 when scoredPlayerIds is not an array', async () => {
      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05', scoredPlayerIds: 'not-an-array' }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('scoredPlayerIds field is required and must be an array');
    });

    it('should return 400 when date format is invalid', async () => {
      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-1-5', scoredPlayerIds: ['player1'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Invalid date format. Expected YYYY-MM-DD');
    });

    it('should return 400 when player IDs contain empty strings', async () => {
      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05', scoredPlayerIds: ['player1', '', 'player2'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('All player IDs must be non-empty strings');
    });

    it('should return 400 when player IDs contain non-strings', async () => {
      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05', scoredPlayerIds: ['player1', 123, 'player2'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('All player IDs must be non-empty strings');
    });

    it('should accept valid request body', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ scoredCount: 5, unscoredCount: 20 });

      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05', scoredPlayerIds: ['player1', 'player2'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Successful requests', () => {
    it('should backfill scored status for valid request', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ scoredCount: 5, unscoredCount: 20 });

      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-01-15',
          scoredPlayerIds: ['player1', 'player2', 'player3', 'player4', 'player5'],
        }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.date).toBe('2026-01-15');
      expect(body.scoredPlayerIds).toEqual(['player1', 'player2', 'player3', 'player4', 'player5']);
      expect(body.scoredCount).toBe(5);
      expect(body.unscoredCount).toBe(20);
      expect(body.message).toBe('Updated 5 player(s) to scored=true and 20 player(s) to scored=false for date 2026-01-15');
    });

    it('should handle empty scoredPlayerIds array', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ scoredCount: 0, unscoredCount: 25 });

      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-02-01',
          scoredPlayerIds: [],
        }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.date).toBe('2026-02-01');
      expect(body.scoredPlayerIds).toEqual([]);
      expect(body.scoredCount).toBe(0);
      expect(body.unscoredCount).toBe(25);
    });

    it('should include correct Content-Type header', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ scoredCount: 3, unscoredCount: 10 });

      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05', scoredPlayerIds: ['p1', 'p2', 'p3'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle zero updates when no players match', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ scoredCount: 0, unscoredCount: 0 });

      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({
          date: '2026-12-31',
          scoredPlayerIds: ['nonexistent1', 'nonexistent2'],
        }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.scoredCount).toBe(0);
      expect(body.unscoredCount).toBe(0);
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in response', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue({ scoredCount: 2, unscoredCount: 8 });

      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-20', scoredPlayerIds: ['p1', 'p2'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,DELETE,OPTIONS');
    });

    it('should include CORS headers in error response', async () => {
      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-1-5', scoredPlayerIds: ['p1'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Error handling', () => {
    it('should handle MongoDB errors', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Connection failed'));

      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05', scoredPlayerIds: ['p1', 'p2'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Failed to backfill scored status');
      expect(body.details).toBe('Connection failed');
    });

    it('should handle unknown errors', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue('Unknown error');

      const request = new Request('https://api.example.com/backfill-scored', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-05', scoredPlayerIds: ['p1'] }),
      });
      const response = await backfillScoredHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Failed to backfill scored status');
      expect(body.details).toBe('Unknown error');
    });
  });
});

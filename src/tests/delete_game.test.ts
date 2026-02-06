import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteGameHandler } from '../handlers/delete_game';
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
}

interface SuccessResponse {
  date: string;
  home: string;
  away: string;
  deletedCount: number;
  message: string;
}

describe('deleteGameHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Parameter validation', () => {
    it('should return 400 when date parameter is missing', async () => {
      const request = new Request('https://api.example.com/game?home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Date parameter is required');
    });

    it('should return 400 when home parameter is missing', async () => {
      const request = new Request('https://api.example.com/game?date=2026-01-05&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Home parameter is required');
    });

    it('should return 400 when away parameter is missing', async () => {
      const request = new Request('https://api.example.com/game?date=2026-01-05&home=TeamA', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Away parameter is required');
    });

    it('should return 400 when date format is invalid', async () => {
      const request = new Request('https://api.example.com/game?date=2026-1-5&home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Invalid date format. Expected YYYY-MM-DD');
    });

    it('should accept valid parameters', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(1);

      const request = new Request('https://api.example.com/game?date=2026-01-05&home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Successful requests', () => {
    it('should delete game for valid parameters', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(25);

      const request = new Request('https://api.example.com/game?date=2026-01-05&home=Lakers&away=Warriors', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.date).toBe('2026-01-05');
      expect(body.home).toBe('Lakers');
      expect(body.away).toBe('Warriors');
      expect(body.deletedCount).toBe(25);
      expect(body.message).toBe('Deleted 25 player(s) for game Lakers vs Warriors on 2026-01-05');
    });

    it('should return zero deletedCount when game not found', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(0);

      const request = new Request('https://api.example.com/game?date=2026-12-31&home=TeamX&away=TeamY', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.date).toBe('2026-12-31');
      expect(body.home).toBe('TeamX');
      expect(body.away).toBe('TeamY');
      expect(body.deletedCount).toBe(0);
      expect(body.message).toBe('Deleted 0 player(s) for game TeamX vs TeamY on 2026-12-31');
    });

    it('should include correct Content-Type header', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(1);

      const request = new Request('https://api.example.com/game?date=2026-01-05&home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should handle team names with spaces', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(20);

      const request = new Request('https://api.example.com/game?date=2026-01-15&home=Los%20Angeles%20Lakers&away=Golden%20State%20Warriors', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      const body = await response.json() as SuccessResponse;
      expect(body.home).toBe('Los Angeles Lakers');
      expect(body.away).toBe('Golden State Warriors');
      expect(body.deletedCount).toBe(20);
    });

    it('should handle different teams on same date', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(15);

      const request = new Request('https://api.example.com/game?date=2026-01-20&home=Celtics&away=Heat', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      const body = await response.json() as SuccessResponse;
      expect(body.deletedCount).toBe(15);
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers with default origin', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(0);

      const request = new Request('https://api.example.com/game?date=2026-01-05&home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,DELETE,OPTIONS');
    });

    it('should include CORS headers with specific origin', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(0);

      const request = new Request('https://api.example.com/game?date=2026-01-05&home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(
        request,
        mockEnv,
        'https://example.com',
        getCorsHeaders
      );
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('should include CORS headers even on error responses', async () => {
      const request = new Request('https://api.example.com/game?home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(
        request,
        mockEnv,
        'https://example.com',
        getCorsHeaders
      );
      
      expect(response.status).toBe(400);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });
  });

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new Request('https://api.example.com/game?date=2026-01-05&home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
      
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Failed to delete game from database');
    });

    it('should include CORS headers on database error', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(
        new Error('Database error')
      );

      const request = new Request('https://api.example.com/game?date=2026-01-05&home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(
        request,
        mockEnv,
        'https://example.com',
        getCorsHeaders
      );
      
      expect(response.status).toBe(500);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });
  });

  describe('Edge cases', () => {
    it('should handle leap year dates', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(0);

      const request = new Request('https://api.example.com/game?date=2024-02-29&home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
    });

    it('should handle date with leading zeros', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(0);

      const request = new Request('https://api.example.com/game?date=2026-01-01&home=TeamA&away=TeamB', {
        method: 'DELETE',
      });
      const response = await deleteGameHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      const body = await response.json() as SuccessResponse;
      expect(body.date).toBe('2026-01-01');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlayersForDate } from '../handlers/get_players_for_date';
import type { Env } from '../env';
import * as mongodb from '../shared/mongodb';

// Mock the MongoDB utilities
vi.mock('../shared/mongodb', () => ({
  withMongoClient: vi.fn(),
  getPlayersCollection: vi.fn(),
}));

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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

interface Player {
  name?: string;
  score?: number;
  date?: string;
  [key: string]: unknown;
}

interface SuccessResponse {
  date: string;
  players: Player[];
}

describe('getPlayersForDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Date validation', () => {
    it('should return 400 when date parameter is missing', async () => {
      const request = new Request('https://api.example.com/players');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Date parameter is required');
    });

    it('should return 400 when date format is invalid', async () => {
      const request = new Request('https://api.example.com/players?date=2026-1-5');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Invalid date format. Expected YYYY-MM-DD');
    });

    it('should return 400 when date contains letters', async () => {
      const request = new Request('https://api.example.com/players?date=20ab-01-05');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Invalid date format. Expected YYYY-MM-DD');
    });

    it('should accept valid date format', async () => {
      const mockPlayers = [
        { name: 'Player 1', score: 100 },
        { name: 'Player 2', score: 95 },
      ];

      vi.mocked(mongodb.withMongoClient).mockImplementation(async (_env, operation) => {
        const mockClient = {} as Awaited<ReturnType<typeof mongodb.connectToMongoDB>>;
        return operation(mockClient);
      });

      // Mock the operation to return players
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(mockPlayers);

      const request = new Request('https://api.example.com/players?date=2026-01-05');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Successful requests', () => {
    it('should return players for valid date', async () => {
      const mockPlayers = [
        { name: 'Player 1', score: 100, date: '2026-01-05' },
        { name: 'Player 2', score: 95, date: '2026-01-05' },
      ];

      vi.mocked(mongodb.withMongoClient).mockResolvedValue(mockPlayers);

      const request = new Request('https://api.example.com/players?date=2026-01-05');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.date).toBe('2026-01-05');
      expect(body.players).toEqual(mockPlayers);
      expect(body.players).toHaveLength(2);
    });

    it('should return empty array when no players found', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/players?date=2026-12-31');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.date).toBe('2026-12-31');
      expect(body.players).toEqual([]);
    });

    it('should include correct Content-Type header', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/players?date=2026-01-05');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers with default origin', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/players?date=2026-01-05');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,OPTIONS');
    });

    it('should include CORS headers with specific origin', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/players?date=2026-01-05');
      const response = await getPlayersForDate(
        request,
        mockEnv,
        'https://example.com',
        getCorsHeaders
      );
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('should include CORS headers even on error responses', async () => {
      const request = new Request('https://api.example.com/players');
      const response = await getPlayersForDate(
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

      const request = new Request('https://api.example.com/players?date=2026-01-05');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
      
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Failed to fetch players from database');
    });

    it('should include CORS headers on database error', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(
        new Error('Database error')
      );

      const request = new Request('https://api.example.com/players?date=2026-01-05');
      const response = await getPlayersForDate(
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
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/players?date=2024-02-29');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
    });

    it('should handle date with leading zeros', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/players?date=2026-01-01');
      const response = await getPlayersForDate(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      const body = await response.json() as SuccessResponse;
      expect(body.date).toBe('2026-01-01');
    });
  });
});

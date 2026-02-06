import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUnscoredDates } from '../handlers/get_unscored_dates';
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
  dates: string[];
}

describe('getUnscoredDates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful requests', () => {
    it('should return unscored dates', async () => {
      const mockDates = ['2026-01-05', '2026-01-06', '2026-01-07'];

      vi.mocked(mongodb.withMongoClient).mockResolvedValue(mockDates);

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.dates).toEqual(mockDates);
      expect(body.dates).toHaveLength(3);
    });

    it('should return empty array when all dates are scored', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.dates).toEqual([]);
    });

    it('should include correct Content-Type header', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers with default origin', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,DELETE,OPTIONS');
    });

    it('should include CORS headers with specific origin', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const customGetCorsHeaders = (origin: string | null) => ({
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      });

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(
        request,
        mockEnv,
        'https://smartscore.nathanprobert.ca',
        customGetCorsHeaders
      );
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://smartscore.nathanprobert.ca');
    });

    it('should include CORS headers in error responses', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,DELETE,OPTIONS');
    });
  });

  describe('Error handling', () => {
    it('should return 500 when database operation fails', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
      
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Failed to fetch unscored dates from database');
    });

    it('should return 500 when withMongoClient throws error', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Connection timeout'));

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
    });

    it('should log error to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Database error');
      
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(mockError);

      const request = new Request('https://api.example.com/unscored-dates');
      await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('MongoDB error:', mockError);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle single unscored date', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(['2026-01-05']);

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.dates).toHaveLength(1);
      expect(body.dates[0]).toBe('2026-01-05');
    });

    it('should handle large number of unscored dates', async () => {
      const largeDateList = Array.from({ length: 100 }, (_, i) => {
        const date = new Date(2026, 0, i + 1);
        return date.toISOString().split('T')[0];
      });
      
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(largeDateList);

      const request = new Request('https://api.example.com/unscored-dates');
      const response = await getUnscoredDates(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.dates).toHaveLength(100);
    });
  });
});

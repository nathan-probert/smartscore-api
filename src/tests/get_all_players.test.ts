import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllPlayers } from '../handlers/get_all_players';
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
  ENVIRONMENT: 'dev',
};

interface ErrorResponse {
  error: string;
}

interface SuccessResponse {
  data: string;
}

describe('getAllPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful requests', () => {
    it('should return all players as base64 encoded data', async () => {
      const mockPlayers = [
        { _id: '1', id: 'player1', name: 'Player 1', score: 100, team_abbr: 'LAL', date: '2026-01-05' },
        { _id: '2', id: 'player2', name: 'Player 2', score: 95, team_abbr: 'GSW', date: '2026-01-05' },
      ];

      vi.mocked(mongodb.withMongoClient).mockResolvedValue(mockPlayers);

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      expect(body.data).toBeDefined();
      
      // Decode and verify the data
      const decoded = JSON.parse(Buffer.from(body.data, 'base64').toString('utf-8'));
      expect(decoded.players).toHaveLength(2);
    });

    it('should exclude _id, id, and team_abbr fields from players', async () => {
      const mockPlayers = [
        { _id: '1', id: 'player1', name: 'Player 1', score: 100, team_abbr: 'LAL', date: '2026-01-05' },
        { _id: '2', id: 'player2', name: 'Player 2', score: 95, team_abbr: 'GSW', date: '2026-01-06' },
      ];

      vi.mocked(mongodb.withMongoClient).mockResolvedValue(mockPlayers);

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      const body = await response.json() as SuccessResponse;
      const decoded = JSON.parse(Buffer.from(body.data, 'base64').toString('utf-8'));
      
      // Check that excluded fields are not present
      decoded.players.forEach((player: Record<string, unknown>) => {
        expect(player).not.toHaveProperty('_id');
        expect(player).not.toHaveProperty('id');
        expect(player).not.toHaveProperty('team_abbr');
        
        // Check that other fields are present
        expect(player).toHaveProperty('name');
        expect(player).toHaveProperty('score');
        expect(player).toHaveProperty('date');
      });
    });

    it('should return empty array when no players found', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(200);
      
      const body = await response.json() as SuccessResponse;
      const decoded = JSON.parse(Buffer.from(body.data, 'base64').toString('utf-8'));
      expect(decoded.players).toEqual([]);
    });

    it('should include correct Content-Type header', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should preserve all non-excluded fields', async () => {
      const mockPlayers = [
        { 
          _id: '1', 
          id: 'player1', 
          name: 'Player 1', 
          score: 100, 
          team_abbr: 'LAL', 
          position: 'PG',
          height: 6.3,
          weight: 185,
          custom_field: 'value'
        },
      ];

      vi.mocked(mongodb.withMongoClient).mockResolvedValue(mockPlayers);

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      const body = await response.json() as SuccessResponse;
      const decoded = JSON.parse(Buffer.from(body.data, 'base64').toString('utf-8'));
      
      const player = decoded.players[0];
      expect(player.name).toBe('Player 1');
      expect(player.score).toBe(100);
      expect(player.position).toBe('PG');
      expect(player.height).toBe(6.3);
      expect(player.weight).toBe(185);
      expect(player.custom_field).toBe('value');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers with default origin', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,OPTIONS');
    });

    it('should include CORS headers with specific origin', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue([]);

      const specificOrigin = 'https://example.com';
      const customGetCorsHeaders = (origin: string | null) => ({
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      });

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, specificOrigin, customGetCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(specificOrigin);
    });

    it('should include CORS headers in error responses', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Error handling', () => {
    it('should return 500 when database operation fails', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Database error'));

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Failed to fetch players from database');
    });

    it('should handle database connection timeout', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Connection timeout'));

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
    });
  });

  describe('Base64 encoding', () => {
    it('should return valid base64 encoded string', async () => {
      const mockPlayers = [
        { name: 'Player 1', score: 100 },
      ];

      vi.mocked(mongodb.withMongoClient).mockResolvedValue(mockPlayers);

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      const body = await response.json() as SuccessResponse;
      
      // Verify it's a valid base64 string by decoding it
      expect(() => Buffer.from(body.data, 'base64').toString('utf-8')).not.toThrow();
      
      // Verify the decoded content is valid JSON
      const decoded = Buffer.from(body.data, 'base64').toString('utf-8');
      expect(() => JSON.parse(decoded)).not.toThrow();
    });

    it('should handle special characters in player data', async () => {
      const mockPlayers = [
        { name: 'Luka Dončić', team: 'Mavericks', nickname: 'The Don\'t Sleep On Me' },
      ];

      vi.mocked(mongodb.withMongoClient).mockResolvedValue(mockPlayers);

      const request = new Request('https://api.example.com/all-players');
      const response = await getAllPlayers(request, mockEnv, null, getCorsHeaders);
      
      const body = await response.json() as SuccessResponse;
      const decoded = JSON.parse(Buffer.from(body.data, 'base64').toString('utf-8'));
      
      expect(decoded.players[0].name).toBe('Luka Dončić');
      expect(decoded.players[0].nickname).toBe('The Don\'t Sleep On Me');
    });
  });
});

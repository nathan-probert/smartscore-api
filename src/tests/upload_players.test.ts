import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadPlayersHandler } from '../handlers/upload_players';
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
  insertedCount: number;
  message: string;
}

const createValidPlayer = () => ({
  name: "Zach Benson",
  id: 8484145,
  gpg: 0.16666666666666666,
  hgpg: 0.14893617021276595,
  five_gpg: 0.2,
  hppg: 0.02127659574468085,
  team_name: "Buffalo",
  tgpg: 3.39285,
  otga: 2.90909,
  otshga: 0.45454545454545453,
  home: true,
  stat: 0.18890845775604248,
  injury_status: "INJURED",
  injury_desc: "Day-To-Day",
  tims: 0
});

describe('uploadPlayersHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request body validation', () => {
    it('should return 400 when request body is not valid JSON', async () => {
      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Invalid JSON in request body');
    });

    it('should return 400 when players field is missing', async () => {
      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('players field is required and must be an array');
    });

    it('should return 400 when players is not an array', async () => {
      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: 'not-an-array' }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('players field is required and must be an array');
    });

    it('should return 400 when players array is empty', async () => {
      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('players array cannot be empty');
    });

    it('should return 400 when player is not an object', async () => {
      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: ['not-an-object'] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Player at index 0 must be an object');
    });

    it('should return 400 when player is missing name field', async () => {
      const player = createValidPlayer();
      delete (player as Partial<typeof player>).name;

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [player] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Player at index 0 is missing required field: name');
    });

    it('should return 400 when player is missing id field', async () => {
      const player = createValidPlayer();
      delete (player as Partial<typeof player>).id;

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [player] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Player at index 0 is missing required field: id');
    });

    it('should return 400 when player is missing team_name field', async () => {
      const player = createValidPlayer();
      delete (player as Partial<typeof player>).team_name;

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [player] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Player at index 0 is missing required field: team_name');
    });

    it('should return 400 when player id is not a number', async () => {
      const player = { ...createValidPlayer(), id: '8484145' as unknown as number };

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [player] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Player at index 0 has invalid id: must be a number');
    });

    it('should return 400 when second player in array is invalid', async () => {
      const validPlayer = createValidPlayer();
      const invalidPlayer = { ...createValidPlayer() };
      delete (invalidPlayer as Partial<typeof invalidPlayer>).name;

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [validPlayer, invalidPlayer] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Player at index 1 is missing required field: name');
    });

    it('should accept valid request body with single player', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(1);

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [createValidPlayer()] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(201);
    });

    it('should accept valid request body with multiple players', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(3);

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ 
          players: [
            createValidPlayer(),
            { ...createValidPlayer(), id: 8484146, name: "Player Two" },
            { ...createValidPlayer(), id: 8484147, name: "Player Three" },
          ] 
        }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(201);
    });
  });

  describe('Successful requests', () => {
    it('should upload players and return inserted count', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(2);

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ 
          players: [
            createValidPlayer(),
            { ...createValidPlayer(), id: 8484146 }
          ] 
        }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(201);
      const body = await response.json() as SuccessResponse;
      expect(body.insertedCount).toBe(2);
      expect(body.message).toBe('Successfully uploaded 2 player(s)');
    });

    it('should filter out stat field from players', async () => {
      let capturedPlayers: Record<string, unknown>[] = [];
      
      vi.mocked(mongodb.withMongoClient).mockImplementation(async (_env, callback) => {
        const mockClient = {} as Parameters<typeof callback>[0];
        const mockCollection = {
          insertMany: vi.fn(async (players: Record<string, unknown>[]) => {
            capturedPlayers = players;
            return { insertedCount: players.length };
          })
        };
        vi.mocked(mongodb.getPlayersCollection).mockReturnValue(mockCollection as unknown as ReturnType<typeof mongodb.getPlayersCollection>);
        return callback(mockClient);
      });

      const playerWithStat = createValidPlayer();
      expect(playerWithStat.stat).toBeDefined();

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [playerWithStat] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(201);
      expect(capturedPlayers).toHaveLength(1);
      expect(capturedPlayers[0]).not.toHaveProperty('stat');
      expect(capturedPlayers[0]).toHaveProperty('name', 'Zach Benson');
      expect(capturedPlayers[0]).toHaveProperty('id', 8484145);
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in successful response', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(1);

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [createValidPlayer()] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, 'https://example.com', getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('should include CORS headers in error response', async () => {
      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await uploadPlayersHandler(request, mockEnv, 'https://example.com', getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });

    it('should handle null origin', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(1);

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [createValidPlayer()] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Error handling', () => {
    it('should return 500 when database operation fails', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [createValidPlayer()] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(500);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Failed to upload players to database');
    });

    it('should include CORS headers in error response', async () => {
      vi.mocked(mongodb.withMongoClient).mockRejectedValue(new Error('Database error'));

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [createValidPlayer()] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, 'https://example.com', getCorsHeaders);
      
      expect(response.status).toBe(500);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });
  });

  describe('Edge cases', () => {
    it('should handle player with null values in optional fields', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(1);

      const player = {
        name: "Test Player",
        id: 8484145,
        team_name: "Test Team",
        gpg: null,
        hgpg: null,
      };

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [player] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(201);
    });

    it('should handle player with additional unknown fields', async () => {
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(1);

      const player = {
        ...createValidPlayer(),
        customField: 'custom value',
        anotherField: 123,
      };

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players: [player] }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(201);
    });

    it('should handle large batch of players', async () => {
      const playerCount = 100;
      vi.mocked(mongodb.withMongoClient).mockResolvedValue(playerCount);

      const players = Array.from({ length: playerCount }, (_, i) => ({
        ...createValidPlayer(),
        id: 8484145 + i,
        name: `Player ${i}`,
      }));

      const request = new Request('https://api.example.com/players', {
        method: 'POST',
        body: JSON.stringify({ players }),
      });
      const response = await uploadPlayersHandler(request, mockEnv, null, getCorsHeaders);
      
      expect(response.status).toBe(201);
      const body = await response.json() as SuccessResponse;
      expect(body.insertedCount).toBe(playerCount);
    });
  });
});

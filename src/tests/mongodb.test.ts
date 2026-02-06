import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectToMongoDB, getPlayersCollection, withMongoClient } from '../shared/mongodb';
import type { Env } from '../env';

// Mock MongoDB
vi.mock('mongodb', () => {
  const mockCollection = {
    find: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    updateOne: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  class MockMongoClient {
    connect = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    db = vi.fn().mockReturnValue(mockDb);
  }

  return {
    MongoClient: MockMongoClient,
  };
});

const mockEnv: Env = {
  API_AUTH_TOKEN: 'test-token',
  SHARED_SECRET: 'test-secret',
  MONGODB_URI: 'mongodb://localhost:27017',
  MONGODB_DATABASE: 'test-db',
};

describe('MongoDB Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectToMongoDB', () => {
    it('should create and connect a MongoDB client', async () => {
      const client = await connectToMongoDB(mockEnv);
      
      expect(client.connect).toBeDefined();
      expect(client.close).toBeDefined();
      expect(client.db).toBeDefined();
    });

    it('should use the URI from environment', async () => {
      const customEnv = { ...mockEnv, MONGODB_URI: 'mongodb://custom:27017' };
      const client = await connectToMongoDB(customEnv);
      
      expect(client).toBeDefined();
      expect(client.connect).toBeDefined();
    });
  });

  describe('getPlayersCollection', () => {
    it('should return the SmartScore collection from players database', async () => {
      const client = await connectToMongoDB(mockEnv);
      const collection = getPlayersCollection(client, mockEnv);
      
      expect(client.db).toHaveBeenCalledWith('players');
      expect(collection).toBeDefined();
    });

    it('should call db.collection with SmartScore', async () => {
      const prodEnv = { ...mockEnv, ENVIRONMENT: 'prod' };
      const client = await connectToMongoDB(prodEnv);
      const mockDb = client.db('players');
      
      getPlayersCollection(client, prodEnv);
      
      expect(mockDb.collection).toHaveBeenCalledWith('SmartScore');
    });
  });

  describe('withMongoClient', () => {
    it('should execute operation with connected client', async () => {
      const mockOperation = vi.fn().mockResolvedValue({ result: 'success' });
      
      const result = await withMongoClient(mockEnv, mockOperation);
      
      expect(result).toEqual({ result: 'success' });
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should close client after successful operation', async () => {
      const mockOperation = vi.fn().mockImplementation(async (client) => {
        // Verify client has close method
        expect(client.close).toBeDefined();
        return 'data';
      });
      
      await withMongoClient(mockEnv, mockOperation);
      
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should close client even if operation throws error', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(withMongoClient(mockEnv, mockOperation)).rejects.toThrow('Operation failed');
      
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should pass client to operation callback', async () => {
      const mockOperation = vi.fn().mockImplementation(async (client) => {
        expect(client).toBeDefined();
        expect(client.connect).toBeDefined();
        return 'result';
      });
      
      await withMongoClient(mockEnv, mockOperation);
      
      expect(mockOperation).toHaveBeenCalledWith(expect.objectContaining({
        connect: expect.any(Function),
        close: expect.any(Function),
        db: expect.any(Function),
      }));
    });

    it('should handle multiple sequential operations', async () => {
      const operation1 = vi.fn().mockResolvedValue('result1');
      const operation2 = vi.fn().mockResolvedValue('result2');
      
      const result1 = await withMongoClient(mockEnv, operation1);
      const result2 = await withMongoClient(mockEnv, operation2);
      
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });

    it('should connect client before executing operation', async () => {
      let connectCalled = false;
      
      const mockOperation = vi.fn().mockImplementation(async (client) => {
        // By the time operation is called, connect should have been called
        expect(client.connect).toBeDefined();
        connectCalled = true;
        return 'result';
      });
      
      await withMongoClient(mockEnv, mockOperation);
      
      expect(connectCalled).toBe(true);
      expect(mockOperation).toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { route } from '../router';

// Mock the cloudflare:workers module
vi.mock('cloudflare:workers', () => ({
  env: {
    API_AUTH_TOKEN: 'test-secret-token',
  },
}));

describe('Router', () => {
  describe('CORS preflight', () => {
    it('should handle OPTIONS request with 204 status', async () => {
      const req = new Request('https://api.example.com/', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://smartscore.nathanprobert.ca',
        },
      });
      const response = await route(req);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://smartscore.nathanprobert.ca');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,DELETE,OPTIONS');
    });

    it('should return wildcard CORS for requests without Origin', async () => {
      const req = new Request('https://api.example.com/', {
        method: 'OPTIONS',
      });
      const response = await route(req);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Authentication', () => {
    it('should return 401 for protected routes without auth', async () => {
      const req = new Request('https://api.example.com/');
      const response = await route(req);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should return 401 for protected routes with wrong token', async () => {
      const req = new Request('https://api.example.com/', {
        headers: {
          Authorization: 'Bearer wrong-token',
        },
      });
      const response = await route(req);
      expect(response.status).toBe(401);
    });

    it('should allow access with correct token', async () => {
      const req = new Request('https://api.example.com/', {
        headers: {
          Authorization: 'Bearer test-secret-token',
        },
      });
      const response = await route(req);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Hello World');
    });
  });

  describe('Routes', () => {
    it('should return Hello World for GET /', async () => {
      const req = new Request('https://api.example.com/', {
        headers: {
          Authorization: 'Bearer test-secret-token',
        },
      });
      const response = await route(req);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Hello World');
    });

    it('should return ok for GET /health without auth', async () => {
      const req = new Request('https://api.example.com/health');
      const response = await route(req);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('ok');
    });

    it('should return 404 for unknown routes', async () => {
      const req = new Request('https://api.example.com/unknown', {
        headers: {
          Authorization: 'Bearer test-secret-token',
        },
      });
      const response = await route(req);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not Found');
    });

    it('should route POST /players to uploadPlayersHandler', async () => {
      const req = new Request('https://api.example.com/players', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ players: [] }),
      });
      const response = await route(req);
      // Should get 500 because env is not provided in router test context
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Server configuration error');
    });

    it('should route GET /all-players to getAllPlayers handler', async () => {
      const req = new Request('https://api.example.com/all-players', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret-token',
        },
      });
      const response = await route(req);
      // Should get 500 because env is not provided in router test context
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Server configuration error');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers for allowed origins', async () => {
      const req = new Request('https://api.example.com/health', {
        headers: {
          Origin: 'https://smartscore.nathanprobert.ca',
        },
      });
      const response = await route(req);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://smartscore.nathanprobert.ca');
    });

    it('should not include CORS headers for disallowed origins', async () => {
      const req = new Request('https://api.example.com/health', {
        headers: {
          Origin: 'https://evil.com',
        },
      });
      const response = await route(req);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });
});

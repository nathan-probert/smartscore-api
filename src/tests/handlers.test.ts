import { describe, it, expect } from 'vitest';
import { hello, health, notFound } from '../handlers';

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
});

describe('Handlers', () => {
  describe('hello', () => {
    it('should return Hello World with 200 status', async () => {
      const response = hello(null, getCorsHeaders);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Hello World');
    });

    it('should include CORS headers', () => {
      const response = hello('https://example.com', getCorsHeaders);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(response.headers.get('Content-Type')).toBe('text/plain');
    });
  });

  describe('health', () => {
    it('should return ok with 200 status', async () => {
      const response = health(null, getCorsHeaders);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('ok');
    });

    it('should include CORS headers', () => {
      const response = health('https://example.com', getCorsHeaders);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });
  });

  describe('notFound', () => {
    it('should return Not Found with 404 status', async () => {
      const response = notFound(null, getCorsHeaders);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not Found');
    });

    it('should include CORS headers', () => {
      const response = notFound('https://example.com', getCorsHeaders);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    });
  });
});

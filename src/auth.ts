// src/auth.ts
// Authentication middleware for Cloudflare Worker

declare const API_AUTH_TOKEN: string;

export function getApiKey(): string {
  return typeof API_AUTH_TOKEN !== "undefined"
    ? API_AUTH_TOKEN
    : (globalThis as Record<string, unknown>).API_AUTH_TOKEN as string;
}

export function getAuthToken(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return auth;
}

export function requireAuth(req: Request): boolean {
  const token = getAuthToken(req);
  return !!token && token === getApiKey();
}

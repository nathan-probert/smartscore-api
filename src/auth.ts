// src/auth.ts
// Authentication middleware for Cloudflare Worker
import { env } from "cloudflare:workers";
import { StatusCodes } from "http-status-codes";

export function getApiKey(): string {
  return env.API_AUTH_TOKEN;
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

export function unauthorized(origin: string | null, getCorsHeaders: (origin: string | null) => HeadersInit): Response {
  return new Response("Unauthorized", {
    status: StatusCodes.UNAUTHORIZED,
    headers: getCorsHeaders(origin),
  });
}

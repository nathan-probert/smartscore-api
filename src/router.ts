
import { hello, health, notFound, getPlayersForDate, deleteGameHandler } from "./handlers";
import { requireAuth, unauthorized } from "./auth";
import { StatusCodes } from "http-status-codes";
import type { Env } from "./env";

// CORS configuration
const ALLOWED_ORIGINS = [
  "https://smartscore.nathanprobert.ca",
  // Add more origins if needed
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (!origin) {
    headers["Access-Control-Allow-Origin"] = "*"; // For non-browser (e.g., Lambda)
  }
  return headers;
}

export async function route(req: Request, env?: Env): Promise<Response> {
  const url = new URL(req.url);
  const origin = req.headers.get("Origin");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: StatusCodes.NO_CONTENT,
      headers: getCorsHeaders(origin),
    });
  }

  // Require authentication for all routes except /health
  if (url.pathname !== "/health") {
    if (!requireAuth(req)) {
      return unauthorized(origin, getCorsHeaders);
    }
  }

  if (req.method === "GET" && url.pathname === "/") {
    return hello(origin, getCorsHeaders);
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return health(origin, getCorsHeaders);
  }

  if (req.method === "GET" && url.pathname === "/players") {
    if (!env) {
      return new Response("Server configuration error", {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        headers: getCorsHeaders(origin),
      });
    }
    return getPlayersForDate(req, env, origin, getCorsHeaders);
  }

  if (req.method === "DELETE" && url.pathname === "/game") {
    if (!env) {
      return new Response("Server configuration error", {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        headers: getCorsHeaders(origin),
      });
    }
    return deleteGameHandler(req, env, origin, getCorsHeaders);
  }

  return notFound(origin, getCorsHeaders);
}

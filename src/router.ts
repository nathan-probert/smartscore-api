
import { hello, health, notFound } from "./handlers";
import { requireAuth, unauthorized } from "./auth";
import { StatusCodes } from "http-status-codes";

// CORS configuration
const ALLOWED_ORIGINS = [
  "https://smartscore.nathanprobert.ca",
  // Add more origins if needed
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (!origin) {
    headers["Access-Control-Allow-Origin"] = "*"; // For non-browser (e.g., Lambda)
  }
  return headers;
}

export async function route(req: Request): Promise<Response> {
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

  return notFound(origin, getCorsHeaders);
}

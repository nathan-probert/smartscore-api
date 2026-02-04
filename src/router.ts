
import { hello } from "./handlers/hello";

import { requireAuth } from "./auth";

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
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  // Require authentication for all routes except /health
  if (url.pathname !== "/health") {
    if (!requireAuth(req)) {
      return new Response("Unauthorized", {
        status: 401,
        headers: getCorsHeaders(origin),
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/") {
    const res = hello();
    const corsHeaders = getCorsHeaders(origin);
    return new Response(await res.text(), {
      status: res.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain",
      },
    });
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return new Response("ok", { status: 200 });
  }

  return new Response("Not Found", {
    status: 404,
    headers: getCorsHeaders(origin),
  });
}

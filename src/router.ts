
import { hello } from "./handlers/hello";
import { requireAuth, unauthorized } from "./auth";


export async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Require authentication for all routes except /health
  if (url.pathname !== "/health") {
    if (!requireAuth(req)) {
      return unauthorized();
    }
  }

  if (req.method === "GET" && url.pathname === "/") {
    return hello();
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return new Response("ok", { status: 200 });
  }

  return new Response("Not Found", { status: 404 });
}

import { hello } from "./handlers/hello";

export async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname === "/") {
    return hello();
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return new Response("ok", { status: 200 });
  }

  return new Response("Not Found", { status: 404 });
}


import { route } from "./router";

// Expose CLOUDFLARE_API_TOKEN from environment
declare const CLOUDFLARE_API_TOKEN: string;
if (typeof CLOUDFLARE_API_TOKEN !== "undefined") {
  (globalThis as Record<string, unknown>).CLOUDFLARE_API_TOKEN = CLOUDFLARE_API_TOKEN;
}

export default {
  async fetch(req: Request): Promise<Response> {
    try {
      return await route(req);
    } catch (err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

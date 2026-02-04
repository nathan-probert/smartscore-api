
import { route } from "./router";

// Expose API_AUTH_TOKEN from environment
declare const API_AUTH_TOKEN: string;
if (typeof API_AUTH_TOKEN !== "undefined") {
  (globalThis as Record<string, unknown>).API_AUTH_TOKEN = API_AUTH_TOKEN;
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

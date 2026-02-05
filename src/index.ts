
import { route } from "./router";
import type { Env } from "./env";

export default {
  async fetch(req: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      return await route(req);
    } catch (err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

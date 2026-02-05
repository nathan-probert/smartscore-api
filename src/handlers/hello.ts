import { StatusCodes } from "http-status-codes";

export function hello(origin: string | null, getCorsHeaders: (origin: string | null) => HeadersInit): Response {
  const corsHeaders = getCorsHeaders(origin);
  return new Response("Hello World", {
    status: StatusCodes.OK,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain",
    },
  });
}

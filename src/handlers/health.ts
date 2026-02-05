import { StatusCodes } from "http-status-codes";

export function health(origin: string | null, getCorsHeaders: (origin: string | null) => HeadersInit): Response {
  return new Response("ok", {
    status: StatusCodes.OK,
    headers: getCorsHeaders(origin),
  });
}

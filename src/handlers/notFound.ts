import { StatusCodes } from "http-status-codes";

export function notFound(origin: string | null, getCorsHeaders: (origin: string | null) => HeadersInit): Response {
  return new Response("Not Found", {
    status: StatusCodes.NOT_FOUND,
    headers: getCorsHeaders(origin),
  });
}
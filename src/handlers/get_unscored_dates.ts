import { StatusCodes } from "http-status-codes";
import type { MongoClient } from "mongodb";
import type { Env } from "../env";
import {
  withMongoClient,
  getPlayersCollection,
} from "../shared";

/**
 * Fetches distinct dates where the scored column is null/undefined
 */
async function fetchUnscoredDates(
  client: MongoClient,
  env: Env
): Promise<string[]> {
  const playersCollection = getPlayersCollection(client, env);
  const dates = await playersCollection.distinct("date", { scored: null });
  return dates as string[];
}

/**
 * Handler for GET /unscored-dates endpoint
 */
export async function getUnscoredDates(
  req: Request,
  env: Env,
  origin: string | null,
  getCorsHeaders: (origin: string | null) => HeadersInit
): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Query unscored dates using shared MongoDB utilities
    const dates = await withMongoClient(env, (client) =>
      fetchUnscoredDates(client, env)
    );

    return new Response(JSON.stringify({ dates }), {
      status: StatusCodes.OK,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("MongoDB error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch unscored dates from database" }),
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
}

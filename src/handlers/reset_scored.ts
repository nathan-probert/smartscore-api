import { StatusCodes } from "http-status-codes";
import type { MongoClient } from "mongodb";
import type { Env } from "../env";
import {
  withMongoClient,
  getPlayersCollection,
} from "../shared";

/**
 * Request body for reset scored endpoint
 */
interface ResetScoredRequest {
  date: string;
}

/**
 * Resets scored status to null for all players on a specific date,
 * so the next backfill (GET /unscored-dates -> distinct("date", {scored: null}))
 * picks the date up again.
 */
async function resetScored(
  client: MongoClient,
  env: Env,
  date: string
): Promise<{ matchedCount: number; modifiedCount: number }> {
  const playersCollection = getPlayersCollection(client, env);

  const result = await playersCollection.updateMany(
    { date: date },
    { $set: { scored: null } }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
}

/**
 * Handler for POST /reset-scored endpoint
 */
export async function resetScoredHandler(
  req: Request,
  env: Env,
  origin: string | null,
  getCorsHeaders: (origin: string | null) => HeadersInit
): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin);

  // Parse request body
  let body: ResetScoredRequest;
  try {
    body = await req.json() as ResetScoredRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      {
        status: StatusCodes.BAD_REQUEST,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Validate required fields
  if (!body.date) {
    return new Response(
      JSON.stringify({ error: "Date field is required" }),
      {
        status: StatusCodes.BAD_REQUEST,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(body.date)) {
    return new Response(
      JSON.stringify({ error: "Invalid date format. Expected YYYY-MM-DD" }),
      {
        status: StatusCodes.BAD_REQUEST,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    // Reset scored status using shared MongoDB utilities
    const result = await withMongoClient(env, (client) =>
      resetScored(client, env, body.date)
    );

    return new Response(
      JSON.stringify({
        date: body.date,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        message: `Reset scored to null for ${result.modifiedCount} player(s) on date ${body.date} (matched ${result.matchedCount})`,
      }),
      {
        status: StatusCodes.OK,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("MongoDB error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to reset scored status",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
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

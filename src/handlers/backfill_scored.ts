import { StatusCodes } from "http-status-codes";
import type { MongoClient } from "mongodb";
import type { Env } from "../env";
import {
  withMongoClient,
  getPlayersCollection,
} from "../shared";

/**
 * Request body for backfill scored endpoint
 */
interface BackfillScoredRequest {
  date: string;
  scoredPlayerIds: string[];
}

/**
 * Backfills scored status for players on a specific date
 */
async function backfillScored(
  client: MongoClient,
  env: Env,
  date: string,
  scoredPlayerIds: string[]
): Promise<{ scoredCount: number; unscoredCount: number }> {
  const playersCollection = getPlayersCollection(client, env);
  
  // Convert string IDs to numbers for MongoDB query
  const numericIds = scoredPlayerIds.map(id => parseInt(id, 10));
  
  // Set scored=true for players in the list
  const scoredResult = await playersCollection.updateMany(
    { date: date, id: { $in: numericIds } },
    { $set: { scored: true } }
  );

  // Set scored=false for all other players on this date
  const unscoredResult = await playersCollection.updateMany(
    { date: date, id: { $nin: numericIds } },
    { $set: { scored: false } }
  );

  return {
    scoredCount: scoredResult.modifiedCount,
    unscoredCount: unscoredResult.modifiedCount,
  };
}

/**
 * Handler for POST /backfill-scored endpoint
 */
export async function backfillScoredHandler(
  req: Request,
  env: Env,
  origin: string | null,
  getCorsHeaders: (origin: string | null) => HeadersInit
): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin);

  // Parse request body
  let body: BackfillScoredRequest;
  try {
    body = await req.json() as BackfillScoredRequest;
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

  if (!body.scoredPlayerIds || !Array.isArray(body.scoredPlayerIds)) {
    return new Response(
      JSON.stringify({ error: "scoredPlayerIds field is required and must be an array" }),
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

  // Validate player IDs
  if (!body.scoredPlayerIds.every(id => typeof id === "string" && id.length > 0)) {
    return new Response(
      JSON.stringify({ error: "All player IDs must be non-empty strings" }),
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
    // Backfill scored status using shared MongoDB utilities
    const result = await withMongoClient(env, (client) =>
      backfillScored(client, env, body.date, body.scoredPlayerIds)
    );

    return new Response(
      JSON.stringify({
        date: body.date,
        scoredPlayerIds: body.scoredPlayerIds,
        scoredCount: result.scoredCount,
        unscoredCount: result.unscoredCount,
        message: `Updated ${result.scoredCount} player(s) to scored=true and ${result.unscoredCount} player(s) to scored=false for date ${body.date}`,
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
        error: "Failed to backfill scored status",
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

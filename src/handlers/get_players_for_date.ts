import { StatusCodes } from "http-status-codes";
import type { MongoClient } from "mongodb";
import type { Env } from "../env";
import {
  withMongoClient,
  getPlayersCollection,
  validateDateParameter,
} from "../shared";

interface Player {
  date: string;
  [key: string]: unknown;
}

/**
 * Fetches players from the database for a specific date
 */
async function fetchPlayersForDate(
  client: MongoClient,
  env: Env,
  date: string
): Promise<Player[]> {
  const playersCollection = getPlayersCollection(client, env);
  const players = await playersCollection.find({ date }).toArray();
  return players as unknown as Player[];
}

/**
 * Handler for GET /players endpoint
 */
export async function getPlayersForDate(
  req: Request,
  env: Env,
  origin: string | null,
  getCorsHeaders: (origin: string | null) => HeadersInit
): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin);
  const url = new URL(req.url);

  // Validate date parameter
  const validation = validateDateParameter(url);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      {
        status: StatusCodes.BAD_REQUEST,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  const { date } = validation;

  try {
    // Query players using shared MongoDB utilities
    const players = await withMongoClient(env, (client) =>
      fetchPlayersForDate(client, env, date)
    );

    return new Response(JSON.stringify({ date, players }), {
      status: StatusCodes.OK,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("MongoDB error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch players from database" }),
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

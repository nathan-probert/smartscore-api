import { StatusCodes } from "http-status-codes";
import type { MongoClient } from "mongodb";
import type { Env } from "../env";
import {
  withMongoClient,
  getPlayersCollection,
} from "../shared";

// Fields to exclude from the player objects
const EXCLUDED_FIELDS = ["_id", "id", "team_abbr"];

interface Player {
  [key: string]: unknown;
}

/**
 * Removes excluded fields from a player object
 */
function filterPlayerFields(player: Player): Player {
  const filtered: Player = {};
  for (const [key, value] of Object.entries(player)) {
    if (!EXCLUDED_FIELDS.includes(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Fetches all players from the database
 */
async function fetchAllPlayers(
  client: MongoClient,
  env: Env
): Promise<Player[]> {
  const playersCollection = getPlayersCollection(client, env);
  const players = await playersCollection.find({}).toArray();
  return players as unknown as Player[];
}

/**
 * Handler for GET /all-players endpoint
 * Returns all players as a base64 encoded JSON string with specified fields excluded
 */
export async function getAllPlayers(
  req: Request,
  env: Env,
  origin: string | null,
  getCorsHeaders: (origin: string | null) => HeadersInit
): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Query all players using shared MongoDB utilities
    const players = await withMongoClient(env, (client) =>
      fetchAllPlayers(client, env)
    );

    // Filter out excluded fields from each player
    const filteredPlayers = players.map(filterPlayerFields);

    // Convert to JSON string
    const jsonString = JSON.stringify({ players: filteredPlayers });

    // Encode to base64 (handle UTF-8 characters properly)
    const base64Encoded = Buffer.from(jsonString, 'utf-8').toString('base64');

    return new Response(JSON.stringify({ data: base64Encoded }), {
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

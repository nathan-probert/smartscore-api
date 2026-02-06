import { StatusCodes } from "http-status-codes";
import type { MongoClient } from "mongodb";
import type { Env } from "../env";
import {
  withMongoClient,
  getPlayersCollection,
} from "../shared";

/**
 * Player data structure from request body
 */
interface PlayerInput {
  name: string;
  id: number;
  gpg: number;
  hgpg: number;
  five_gpg: number;
  hppg: number;
  team_name: string;
  tgpg: number;
  otga: number;
  otshga: number;
  home: boolean;
  stat?: number;  // This field will be filtered out
  injury_status: string;
  injury_desc: string;
  tims: number;
  [key: string]: unknown;  // Allow additional fields
}

/**
 * Request body for upload players endpoint
 */
interface UploadPlayersRequest {
  players: PlayerInput[];
}

/**
 * Fields to filter out before inserting into database
 */
const FILTERED_FIELDS = new Set(["stat"]);

/**
 * Filters out unwanted fields from a player object
 */
function filterPlayerFields(player: PlayerInput): Omit<PlayerInput, "stat"> {
  const filtered: Record<string, unknown> = {};
  for (const key in player) {
    if (!FILTERED_FIELDS.has(key)) {
      filtered[key] = player[key];
    }
  }
  return filtered;
}

/**
 * Uploads a batch of players to the database
 */
async function uploadPlayers(
  client: MongoClient,
  env: Env,
  players: PlayerInput[]
): Promise<number> {
  const playersCollection = getPlayersCollection(client, env);
  
  // Filter out unwanted fields from all players
  const filteredPlayers = players.map(filterPlayerFields);
  
  // Insert all players at once
  const result = await playersCollection.insertMany(filteredPlayers);
  
  return result.insertedCount;
}

/**
 * Handler for POST /players endpoint
 */
export async function uploadPlayersHandler(
  req: Request,
  env: Env,
  origin: string | null,
  getCorsHeaders: (origin: string | null) => HeadersInit
): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin);

  // Parse request body
  let body: UploadPlayersRequest;
  try {
    body = await req.json() as UploadPlayersRequest;
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
  if (!body.players || !Array.isArray(body.players)) {
    return new Response(
      JSON.stringify({ error: "players field is required and must be an array" }),
      {
        status: StatusCodes.BAD_REQUEST,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (body.players.length === 0) {
    return new Response(
      JSON.stringify({ error: "players array cannot be empty" }),
      {
        status: StatusCodes.BAD_REQUEST,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Validate each player has required fields
  for (let i = 0; i < body.players.length; i++) {
    const player = body.players[i];
    
    if (!player || typeof player !== 'object') {
      return new Response(
        JSON.stringify({ error: `Player at index ${i} must be an object` }),
        {
          status: StatusCodes.BAD_REQUEST,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check for required fields
    const requiredFields = ['name', 'id', 'team_name'];
    for (const field of requiredFields) {
      if (!(field in player) || player[field] === null || player[field] === undefined) {
        return new Response(
          JSON.stringify({ error: `Player at index ${i} is missing required field: ${field}` }),
          {
            status: StatusCodes.BAD_REQUEST,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    // Validate id is a number
    if (typeof player.id !== 'number') {
      return new Response(
        JSON.stringify({ error: `Player at index ${i} has invalid id: must be a number` }),
        {
          status: StatusCodes.BAD_REQUEST,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  try {
    // Upload players using shared MongoDB utilities
    const insertedCount = await withMongoClient(env, (client) =>
      uploadPlayers(client, env, body.players)
    );

    return new Response(
      JSON.stringify({ 
        insertedCount,
        message: `Successfully uploaded ${insertedCount} player(s)`,
      }),
      {
        status: StatusCodes.CREATED,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("MongoDB error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to upload players to database" }),
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

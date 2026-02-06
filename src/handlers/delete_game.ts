import { StatusCodes } from "http-status-codes";
import type { MongoClient } from "mongodb";
import type { Env } from "../env";
import {
  withMongoClient,
  getPlayersCollection,
  validateGameParameters,
} from "../shared";

/**
 * Deletes a specific game from the database
 */
async function deleteGame(
  client: MongoClient,
  env: Env,
  date: string,
  home: string,
  away: string
): Promise<number> {
  const playersCollection = getPlayersCollection(client, env);
  const result = await playersCollection.deleteMany({
    date,
    team_abbr: { $in: [home, away] }
  });
  return result.deletedCount;
}

/**
 * Handler for DELETE /game endpoint
 */
export async function deleteGameHandler(
  req: Request,
  env: Env,
  origin: string | null,
  getCorsHeaders: (origin: string | null) => HeadersInit
): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin);
  const url = new URL(req.url);

  // Validate game parameters
  const validation = validateGameParameters(url);
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

  const { date, home, away } = validation;

  try {
    // Delete game using shared MongoDB utilities
    const deletedCount = await withMongoClient(env, (client) =>
      deleteGame(client, env, date, home, away)
    );

    return new Response(
      JSON.stringify({ 
        date,
        home,
        away,
        deletedCount,
        message: `Deleted ${deletedCount} player(s) for game ${home} vs ${away} on ${date}`,
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
      JSON.stringify({ error: "Failed to delete game from database" }),
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

import { StatusCodes } from "http-status-codes";
import { MongoClient } from "mongodb";
import type { Env } from "../env";

export async function getPlayersForDate(
  req: Request,
  env: Env,
  origin: string | null,
  getCorsHeaders: (origin: string | null) => HeadersInit
): Promise<Response> {
  const corsHeaders = getCorsHeaders(origin);
  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return new Response(
      JSON.stringify({ error: "Date parameter is required" }),
      {
        status: StatusCodes.BAD_REQUEST,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
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

  let client: MongoClient | null = null;

  try {
    // Connect to MongoDB
    client = new MongoClient(env.MONGODB_URI);
    await client.connect();

    const db = client.db(env.MONGODB_DATABASE);
    const playersCollection = db.collection("players");

    // Query players for the specified date, excluding _id field
    const players = await playersCollection
      .find({ date })
      .project({ _id: 0 })
      .toArray();

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
  } finally {
    // Close the MongoDB connection
    if (client) {
      await client.close();
    }
  }
}

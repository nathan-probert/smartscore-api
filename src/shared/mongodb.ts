import { MongoClient, Collection } from "mongodb";
import type { Env } from "../env";

/**
 * Creates and connects a MongoDB client
 */
export async function connectToMongoDB(env: Env): Promise<MongoClient> {
  const client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  return client;
}

/**
 * Gets the SmartScore players collection
 */
export function getPlayersCollection(client: MongoClient): Collection {
  const db = client.db("players");
  return db.collection("SmartScore");
}

/**
 * Executes a database operation with automatic connection management
 */
export async function withMongoClient<T>(
  env: Env,
  operation: (client: MongoClient) => Promise<T>
): Promise<T> {
  let client: MongoClient | null = null;
  try {
    client = await connectToMongoDB(env);
    return await operation(client);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

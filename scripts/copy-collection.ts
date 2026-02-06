/**
 * Script to copy all documents from SmartScore collection to SmartScoreDev
 * Usage: npm run script scripts/copy-collection.ts -- --confirm
 * 
 * WARNING: This will overwrite all data in SmartScoreDev!
 */

import { MongoClient } from "mongodb";
import { config } from "dotenv";

// Load environment variables from .env file
config();

export {};

interface Args {
  confirm?: boolean;
  clear?: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2).filter(arg => arg.startsWith("--"));
  const parsed: Args = {
    confirm: false,
    clear: false,
  };

  args.forEach((arg) => {
    if (arg === "--confirm" || arg === "--yes" || arg === "-y") {
      parsed.confirm = true;
    } else if (arg === "--clear") {
      parsed.clear = true;
    }
  });

  return parsed;
}

async function copyCollection(confirm: boolean, clearFirst: boolean) {
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    console.error("\n❌ Error: MONGODB_URI environment variable is required\n");
    console.log("Set it in your environment or .env file\n");
    return;
  }

  console.log("\n⚠️  WARNING: This will copy SmartScore → SmartScoreDev");
  if (clearFirst) {
    console.log("           AND clear all existing data in SmartScoreDev first!\n");
  } else {
    console.log("           This may create duplicates if data already exists!\n");
  }

  // Safety check - require confirmation flag
  if (!confirm) {
    console.log("❌ Operation cancelled!");
    console.log("To confirm, add the --confirm flag:");
    console.log("   npm run script scripts/copy-collection.ts -- --confirm");
    if (!clearFirst) {
      console.log("\nTo clear SmartScoreDev before copying, add --clear:");
      console.log("   npm run script scripts/copy-collection.ts -- --confirm --clear\n");
    }
    return;
  }

  let client: MongoClient | null = null;

  try {
    console.log("📡 Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected!\n");

    const db = client.db("players");
    const sourceCollection = db.collection("SmartScore");
    const targetCollection = db.collection("SmartScoreDev");

    // Optional: Clear target collection first
    if (clearFirst) {
      console.log("🗑️  Clearing SmartScoreDev...");
      const deleteResult = await targetCollection.deleteMany({});
      console.log(`   Deleted ${deleteResult.deletedCount} existing documents\n`);
    }

    // Count source documents
    console.log("📊 Counting source documents...");
    const count = await sourceCollection.countDocuments();
    console.log(`   Found ${count} documents in SmartScore\n`);

    if (count === 0) {
      console.log("⚠️  No documents to copy!\n");
      return;
    }

    // Copy all documents
    console.log("📋 Copying documents...");
    const documents = await sourceCollection.find({}).toArray();
    
    if (documents.length > 0) {
      const insertResult = await targetCollection.insertMany(documents);
      console.log(`✅ Successfully copied ${insertResult.insertedCount} documents!\n`);
      
      // Show some stats
      const targetCount = await targetCollection.countDocuments();
      console.log("📊 Final stats:");
      console.log(`   SmartScore:    ${count} documents`);
      console.log(`   SmartScoreDev: ${targetCount} documents\n`);
    }

  } catch (error) {
    console.error("\n❌ Error occurred:");
    console.error(error);
    console.log();
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 Disconnected from MongoDB\n");
    }
  }
}

// Run the script
const args = parseArgs();
copyCollection(args.confirm ?? false, args.clear ?? false);

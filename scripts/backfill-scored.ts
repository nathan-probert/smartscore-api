/**
 * Script to backfill scored status for players on a specific date
 * Usage: npx tsx scripts/backfill-scored.ts --date=2026-02-05 --scoredIds="player1,player2,player3" --env=dev --confirm
 * 
 * This will set scored=true for the specified players and scored=false for all others on that date.
 */

import { CONFIG } from "./config.js";

export {};

interface Args {
  date: string;
  scoredIds: string;
  env: "dev" | "prod" | "local";
  token?: string;
  confirm?: boolean;
}

function parseArgs(): Args {
  // Filter to only include arguments starting with --
  const args = process.argv.slice(2).filter(arg => arg.startsWith("--"));
  const parsed: Partial<Args> = {
    env: (process.env.API_ENV as "dev" | "prod" | "local") || "local",
    date: process.env.DATE || new Date().toISOString().split("T")[0],
    confirm: false,
  };

  args.forEach((arg) => {
    if (arg.startsWith("--date=")) {
      parsed.date = arg.split("=")[1];
    } else if (arg.startsWith("--scoredIds=")) {
      parsed.scoredIds = arg.split("=")[1];
    } else if (arg.startsWith("--env=")) {
      parsed.env = arg.split("=")[1] as "dev" | "prod" | "local";
    } else if (arg.startsWith("--token=")) {
      parsed.token = arg.split("=")[1];
    } else if (arg === "--confirm" || arg === "--yes" || arg === "-y") {
      parsed.confirm = true;
    }
  });

  // Also support environment variables
  if (process.env.AUTH_TOKEN && !parsed.token) {
    parsed.token = process.env.AUTH_TOKEN;
  }

  return parsed as Args;
}

async function backfillScored(
  date: string,
  scoredIds: string,
  env: string,
  token?: string,
  confirm?: boolean
) {
  if (!date || !scoredIds) {
    console.error("\n❌ Error: Both --date and --scoredIds parameters are required\n");
    console.log("Usage: npx tsx scripts/backfill-scored.ts --date=YYYY-MM-DD --scoredIds=\"id1,id2,id3\" --env=dev --confirm\n");
    return;
  }

  const baseUrl = CONFIG.urls[env as keyof typeof CONFIG.urls] || CONFIG.urls.local;
  const url = `${baseUrl}/backfill-scored`;
  
  // Parse the player IDs
  const scoredPlayerIds = scoredIds.split(",").map(id => id.trim()).filter(id => id.length > 0);

  if (scoredPlayerIds.length === 0) {
    console.error("\n❌ Error: No valid player IDs provided\n");
    return;
  }

  console.log(`\n⚠️  WARNING: This will backfill scored status for:`);
  console.log(`   Date: ${date}`);
  console.log(`   Scored players: ${scoredPlayerIds.join(", ")}`);
  console.log(`📡 URL: ${url}`);
  console.log(`🌍 Environment: ${env}\n`);

  // Safety check - require confirmation flag for prod
  if (env === "prod" && !confirm) {
    console.log("❌ Operation cancelled!");
    console.log("To confirm changes to production data, add the --confirm flag:");
    console.log(`   npx tsx scripts/backfill-scored.ts --date=${date} --scoredIds="${scoredIds}" --env=${env} --confirm\n`);
    return;
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (process.env.API_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.API_AUTH_TOKEN}`;
  } else if (CONFIG.authToken) {
    headers["Authorization"] = `Bearer ${CONFIG.authToken}`;
  }

  console.log("🔄 Backfilling scored status...\n");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        date: date,
        scoredPlayerIds: scoredPlayerIds,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    // Get response body as text first, then parse
    const responseText = await response.text();
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log("\n✅ Success!\n");
      console.log(`📅 Date: ${data.date}`);
      console.log(`✓ Scored players updated: ${data.scoredCount}`);
      console.log(`✗ Unscored players updated: ${data.unscoredCount}`);
      console.log(`📝 Message: ${data.message}\n`);
    } else {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { error: responseText };
      }
      console.log("\n❌ Error:\n");
      console.log(JSON.stringify(errorData, null, 2));
    }
  } catch (error) {
    console.error("\n❌ Request failed:");
    console.error(error);
  }
}

// Run the script
const args = parseArgs();
backfillScored(args.date, args.scoredIds, args.env, args.token, args.confirm);

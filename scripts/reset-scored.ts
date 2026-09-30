/**
 * Script to reset scored status to null for a specific date (undo a bad backfill run)
 * Usage: npx tsx scripts/reset-scored.ts --date=2026-09-30 --env=dev --confirm
 *
 * This will set scored=null for all players on that date, so the next backfill
 * (GET /unscored-dates -> distinct("date", {scored: null})) picks it up again.
 */

import { CONFIG } from "./config.js";

export {};

interface Args {
  date: string;
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

async function resetScored(
  date: string,
  env: string,
  token?: string,
  confirm?: boolean
) {
  if (!date) {
    console.error("\n❌ Error: --date parameter is required\n");
    console.log("Usage: npx tsx scripts/reset-scored.ts --date=YYYY-MM-DD --env=dev --confirm\n");
    return;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    console.error("\n❌ Error: Invalid date format. Expected YYYY-MM-DD\n");
    return;
  }

  const baseUrl = CONFIG.urls[env as keyof typeof CONFIG.urls] || CONFIG.urls.local;
  const url = `${baseUrl}/reset-scored`;

  console.log(`\n⚠️  WARNING: This will reset scored to null for ALL players on:`);
  console.log(`   Date: ${date}`);
  console.log(`📡 URL: ${url}`);
  console.log(`🌍 Environment: ${env}\n`);

  // Safety check - require confirmation flag (destructive, like delete-game.ts)
  if (!confirm) {
    console.log("❌ Operation cancelled!");
    console.log("To confirm resetting scored status, add the --confirm flag:");
    console.log(`   npx tsx scripts/reset-scored.ts --date=${date} --env=${env} --confirm\n`);
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

  console.log("🔄 Resetting scored status...\n");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        date: date,
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    // Get response body as text first, then parse
    const responseText = await response.text();

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log("\n✅ Success!\n");
      console.log(`📅 Date: ${data.date}`);
      console.log(`🔍 Matched: ${data.matchedCount} player(s)`);
      console.log(`✏️  Modified: ${data.modifiedCount} player(s)`);
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
resetScored(args.date, args.env, args.token, args.confirm);

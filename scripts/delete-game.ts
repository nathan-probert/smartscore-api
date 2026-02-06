/**
 * Script to delete a specific game
 * Usage: npm run script scripts/delete-game.ts -- --date=2026-02-05 --home=Lakers --away=Warriors --env=dev
 * 
 * WARNING: This will permanently delete all players for the specified game!
 */

import { CONFIG } from "./config.js";

export {};

interface Args {
  date: string;
  home: string;
  away: string;
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
    } else if (arg.startsWith("--home=")) {
      parsed.home = arg.split("=")[1];
    } else if (arg.startsWith("--away=")) {
      parsed.away = arg.split("=")[1];
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

async function deleteGame(
  date: string,
  home: string,
  away: string,
  env: string,
  token?: string,
  confirm?: boolean
) {
  if (!home || !away) {
    console.error("\n❌ Error: Both --home and --away parameters are required\n");
    console.log("Usage: npm run delete-game -- --date=2026-02-05 --home=Lakers --away=Warriors --env=dev --confirm\n");
    return;
  }

  const baseUrl = CONFIG.urls[env as keyof typeof CONFIG.urls] || CONFIG.urls.local;
  const params = new URLSearchParams({ date, home, away });
  const url = `${baseUrl}/game?${params}`;

  console.log(`\n⚠️  WARNING: This will delete the game:`);
  console.log(`   ${home} vs ${away} on ${date}`);
  console.log(`📡 URL: ${url}`);
  console.log(`🌍 Environment: ${env}\n`);

  // Safety check - require confirmation flag
  if (!confirm) {
    console.log("❌ Operation cancelled!");
    console.log("To confirm deletion, add the --confirm flag:");
    console.log(`   npm run delete-game -- --date=${date} --home="${home}" --away="${away}" --env=${env} --confirm\n`);
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

  console.log("🗑️  Deleting game...\n");

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok) {
      console.log("\n✅ Success!\n");
      console.log(`📊 Deleted ${data.deletedCount} player(s)`);
      console.log(`📅 Date: ${data.date}`);
      console.log(`🏠 Home: ${data.home}`);
      console.log(`✈️  Away: ${data.away}`);
      console.log(`📝 Message: ${data.message}\n`);
    } else {
      console.log("\n❌ Error:\n");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("\n❌ Request failed:");
    console.error(error);
  }
}

// Run the script
const args = parseArgs();
deleteGame(args.date, args.home, args.away, args.env, args.token, args.confirm);

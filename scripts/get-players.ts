/**
 * Script to fetch players for a specific date
 * Usage: npm run script scripts/get-players.ts -- --date=2026-02-05 --env=dev
 */

import { CONFIG } from "./config.js";

export {};

interface Args {
  date: string;
  env: "dev" | "prod" | "local";
  token?: string;
}

function parseArgs(): Args {
  // Filter to only include arguments starting with --
  const args = process.argv.slice(2).filter(arg => arg.startsWith("--"));
  const parsed: Partial<Args> = {
    env: (process.env.API_ENV as "dev" | "prod" | "local") || "local",
    date: process.env.DATE || new Date().toISOString().split("T")[0],
  };

  args.forEach((arg) => {
    if (arg.startsWith("--date=")) {
      parsed.date = arg.split("=")[1];
    } else if (arg.startsWith("--env=")) {
      parsed.env = arg.split("=")[1] as "dev" | "prod" | "local";
    } else if (arg.startsWith("--token=")) {
      parsed.token = arg.split("=")[1];
    }
  });

  // Also support environment variables
  if (process.env.AUTH_TOKEN && !parsed.token) {
    parsed.token = process.env.AUTH_TOKEN;
  }

  return parsed as Args;
}

async function getPlayersForDate(date: string, env: string, token?: string) {
  const baseUrl = CONFIG.urls[env as keyof typeof CONFIG.urls] || CONFIG.urls.local;
  const url = `${baseUrl}/players?date=${date}`;

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

  console.log(`\n🔍 Fetching players for date: ${date}`);
  console.log(`📡 URL: ${url}\n`);

  try {
    const response = await fetch(url, { headers });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok) {
      console.log("\n✅ Success!\n");
      console.log(JSON.stringify(data, null, 2));
      console.log(`\n📊 Total players: ${data.players?.length || 0}`);
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
getPlayersForDate(args.date, args.env, args.token);

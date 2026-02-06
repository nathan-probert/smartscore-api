/**
 * Script to upload a batch of players
 * Usage: npm run script scripts/upload-players.ts -- --date=2026-02-06 --env=dev
 * 
 * The player data is hardcoded in this script.
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
    date: process.env.DATE || new Date().toISOString().split("T")[0],
    env: (process.env.API_ENV as "dev" | "prod" | "local") || "local",
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

// Hardcoded example player data
const EXAMPLE_PLAYERS = [
  {
    name: "Zach Benson",
    id: 8484145,
    gpg: 0.16667,
    hgpg: 0.14894,
    five_gpg: 0.2,
    hppg: 0.02128,
    team_name: "Buffalo",
    tgpg: 3.39285,
    otga: 2.90909,
    otshga: 0.45455,
    home: true,
    stat: 0.18891,
    injury_status: "INJURED",
    injury_desc: "Day-To-Day",
    tims: 0,
  },
  {
    name: "Connor McDavid",
    id: 8477934,
    gpg: 0.6,
    hgpg: 0.57895,
    five_gpg: 0.7,
    hppg: 0.12281,
    team_name: "Edmonton",
    tgpg: 3.2,
    otga: 3.1,
    otshga: 0.52,
    home: false,
    stat: 0.65,
    injury_status: "HEALTHY",
    injury_desc: "",
    tims: 0,
  }
];

async function uploadPlayers(date: string, env: string, token?: string) {
  const baseUrl = CONFIG.urls[env as keyof typeof CONFIG.urls] || CONFIG.urls.local;
  const url = `${baseUrl}/players`;

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

  console.log(`\n📤 Uploading ${EXAMPLE_PLAYERS.length} player(s)...`);
  console.log(`� Date: ${date}`);
  console.log(`�📡 URL: ${url}`);
  console.log(`🌍 Environment: ${env}\n`);

  // Show players being uploaded
  console.log("Players to upload:");
  EXAMPLE_PLAYERS.forEach((player, i) => {
    console.log(`  ${i + 1}. ${player.name} (ID: ${player.id}) - ${player.team_name}`);
  });
  console.log();

  // Add date to each player
  const playersWithDate = EXAMPLE_PLAYERS.map(player => ({
    ...player,
    date,
  }));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ players: playersWithDate }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok) {
      console.log("\n✅ Success!\n");
      console.log(JSON.stringify(data, null, 2));
      console.log(`\n📊 ${data.insertedCount} player(s) uploaded successfully!`);
      console.log("\n📝 Note: The 'stat' field was filtered out before insertion.");
    } else {
      console.log("\n❌ Error:\n");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("\n❌ Request failed:");
    console.error(error);
  }
}

// Main execution
const args = parseArgs();
uploadPlayers(args.date, args.env, args.token);

/**
 * Script to fetch all players (base64 encoded)
 * Usage: npm run script scripts/get-all-players.ts -- --env=dev
 */

import { CONFIG } from "./config.js";

export {};

interface Args {
  env: "dev" | "prod" | "local";
  token?: string;
  decode?: boolean;
}

function parseArgs(): Args {
  // Filter to only include arguments starting with --
  const args = process.argv.slice(2).filter(arg => arg.startsWith("--"));
  const parsed: Partial<Args> = {
    env: (process.env.API_ENV as "dev" | "prod" | "local") || "local",
    decode: true,
  };

  args.forEach((arg) => {
    if (arg.startsWith("--env=")) {
      parsed.env = arg.split("=")[1] as "dev" | "prod" | "local";
    } else if (arg.startsWith("--token=")) {
      parsed.token = arg.split("=")[1];
    } else if (arg === "--no-decode") {
      parsed.decode = false;
    }
  });

  // Also support environment variables
  if (process.env.AUTH_TOKEN && !parsed.token) {
    parsed.token = process.env.AUTH_TOKEN;
  }

  return parsed as Args;
}

async function getAllPlayers(env: string, token?: string, decode = true) {
  const baseUrl = CONFIG.urls[env as keyof typeof CONFIG.urls] || CONFIG.urls.local;
  const url = `${baseUrl}/all-players`;

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

  console.log(`\n🔍 Fetching all players`);
  console.log(`📡 URL: ${url}\n`);

  try {
    const response = await fetch(url, { headers });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok) {
      console.log("\n✅ Success!\n");

      if (decode && data.data) {
        // Decode the base64 data
        const decodedJson = Buffer.from(data.data, 'base64').toString('utf-8');
        const decodedData = JSON.parse(decodedJson);

        console.log("📦 Base64 data size:", data.data.length, "characters");
        console.log("📊 Total players:", decodedData.players?.length || 0);
        
        if (decodedData.players?.length > 0) {
          console.log("\n📝 First 3 players (preview):\n");
          console.log(JSON.stringify(decodedData.players.slice(0, 3), null, 2));
          
          // Show what fields are included/excluded
          const firstPlayer = decodedData.players[0];
          console.log("\n🔑 Available fields:", Object.keys(firstPlayer).join(", "));
          console.log("❌ Excluded fields: _id, id, team_abbr");
        }
      } else {
        console.log("📦 Raw base64 data:\n");
        console.log(data.data?.substring(0, 100) + "...");
        console.log("\n💡 Use --decode to see the full data (default behavior)");
      }
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
getAllPlayers(args.env, args.token, args.decode);

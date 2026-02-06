/**
 * Script to fetch dates with unscored games
 * Usage: npm run script scripts/get-unscored-dates.ts -- --env=dev
 */

import { CONFIG } from "./config.js";

export {};

interface Args {
  env: "dev" | "prod" | "local";
  token?: string;
}

function parseArgs(): Args {
  // Filter to only include arguments starting with --
  const args = process.argv.slice(2).filter(arg => arg.startsWith("--"));
  const parsed: Partial<Args> = {
    env: (process.env.API_ENV as "dev" | "prod" | "local") || "local",
  };

  args.forEach((arg) => {
    if (arg.startsWith("--env=")) {
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

async function getUnscoredDates(env: string, token?: string) {
  const baseUrl = CONFIG.urls[env as keyof typeof CONFIG.urls] || CONFIG.urls.local;
  const url = `${baseUrl}/unscored-dates`;

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

  console.log(`\n🔍 Fetching dates with unscored games`);
  console.log(`📡 URL: ${url}\n`);

  try {
    const response = await fetch(url, { headers });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.ok) {
      console.log("\n✅ Success!\n");
      console.log(JSON.stringify(data.dates, null, 2));
      console.log(`\n📊 Total unscored dates: ${data.dates?.length || 0}`);
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
getUnscoredDates(args.env, args.token);

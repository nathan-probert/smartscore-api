/**
 * Script to test the hello endpoint (requires auth)
 * Usage: npm run script scripts/test-hello.ts -- --env=dev --token=YOUR_TOKEN
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
    env: "local",
  };

  args.forEach((arg) => {
    if (arg.startsWith("--env=")) {
      parsed.env = arg.split("=")[1] as "dev" | "prod" | "local";
    } else if (arg.startsWith("--token=")) {
      parsed.token = arg.split("=")[1];
    }
  });

  return parsed as Args;
}

async function testHello(env: string, token?: string) {
  const baseUrl = CONFIG.urls[env as keyof typeof CONFIG.urls] || CONFIG.urls.local;
  const url = `${baseUrl}/`;

  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (process.env.API_AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.API_AUTH_TOKEN}`;
  } else if (CONFIG.authToken) {
    headers["Authorization"] = `Bearer ${CONFIG.authToken}`;
  }

  console.log(`\n👋 Testing hello endpoint`);
  console.log(`📡 URL: ${url}\n`);

  try {
    const response = await fetch(url, { headers });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const text = await response.text();

    if (response.ok) {
      console.log("\n✅ Success!\n");
      console.log(`Response: ${text}`);
    } else {
      console.log("\n❌ Error:\n");
      console.log(text);
    }
  } catch (error) {
    console.error("\n❌ Request failed:");
    console.error(error);
  }
}

// Run the script
const args = parseArgs();
testHello(args.env, args.token);

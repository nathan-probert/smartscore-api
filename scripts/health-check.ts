/**
 * Script to check API health
 * Usage: npm run script scripts/health-check.ts -- --env=dev
 */

import { CONFIG } from "./config.js";

export {};

interface Args {
  env: "dev" | "prod" | "local";
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
    }
  });

  return parsed as Args;
}

async function checkHealth(env: string) {
  const baseUrl = CONFIG.urls[env as keyof typeof CONFIG.urls] || CONFIG.urls.local;
  const url = `${baseUrl}/health`;

  console.log(`\n🏥 Health check for: ${env}`);
  console.log(`📡 URL: ${url}\n`);

  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`⏱️  Response time: ${duration}ms`);

    const text = await response.text();

    if (response.ok) {
      console.log("\n✅ API is healthy!\n");
      console.log(`Response: ${text}`);
    } else {
      console.log("\n❌ API health check failed:\n");
      console.log(text);
    }
  } catch (error) {
    console.error("\n❌ Health check failed:");
    console.error(error);
  }
}

// Run the script
const args = parseArgs();
checkHealth(args.env);

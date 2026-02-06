/**
 * Example configuration for Node.js scripts
 * Copy this to config.ts and update with your actual values
 */

export const CONFIG = {
  // Your API authentication token
  authToken: "your-auth-token-here",
  
  // Base URLs for different environments
  urls: {
    dev: "https://smartscore-api-dev.your-worker.workers.dev",
    prod: "https://smartscore-api-prod.your-worker.workers.dev",
    local: "http://localhost:8787",
  },
};

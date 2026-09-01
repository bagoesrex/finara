import "dotenv/config";

import { randomUUID } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for E2E tests.");
}

let parsedDatabaseUrl: URL;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
}

if (
  !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
  !["localhost", "127.0.0.1", "[::1]"].includes(parsedDatabaseUrl.hostname)
) {
  throw new Error("E2E tests require a local PostgreSQL database.");
}

process.env.FINARA_E2E_SERVER_TOKEN = randomUUID();

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  globalTeardown: "./e2e/global-teardown.ts",
  preserveOutput: "always",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    actionTimeout: 10_000,
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-edge",
      use: {
        ...devices["Pixel 7"],
        channel: "msedge",
        locale: "id-ID",
        timezoneId: "Asia/Jakarta",
      },
    },
  ],
  webServer: {
    command: "node ./scripts/start-e2e-server.mjs",
    url: `${baseURL}/welcome`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

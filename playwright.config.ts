import { randomUUID } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.FINARA_E2E_PORT?.trim() || "3000";
if (!/^\d+$/.test(e2ePort)) {
  throw new Error("FINARA_E2E_PORT must be a numeric TCP port.");
}
const portNumber = Number(e2ePort);
if (
  !Number.isSafeInteger(portNumber) ||
  portNumber < 1_024 ||
  portNumber > 65_535
) {
  throw new Error("FINARA_E2E_PORT must be between 1024 and 65535.");
}

const baseURL = `http://localhost:${e2ePort}`;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for E2E tests.");
}

const parsedDatabaseUrl = (() => {
  try {
    return new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }
})();

if (
  !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
  !["localhost", "127.0.0.1", "[::1]"].includes(parsedDatabaseUrl.hostname)
) {
  throw new Error("E2E tests require a local PostgreSQL database.");
}

process.env.FINARA_E2E_SERVER_TOKEN = randomUUID();
process.env.PORT = e2ePort;
process.env.BETTER_AUTH_URL = baseURL;

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
    command: "bun ./scripts/start-e2e-server.mjs",
    url: `${baseURL}/welcome`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

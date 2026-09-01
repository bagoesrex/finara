import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

const TEST_EMAIL_PATTERN = /^e2e-[a-f0-9-]+@example\.invalid$/;
const LOCAL_AUTH_RATE_LIMIT_KEYS = [
  "0000:0000:0000:0000:0000:0000:0000:0000|/sign-up/email",
  "0000:0000:0000:0000:0000:0000:0000:0000|/sign-in/email",
  "0000:0000:0000:0000:0000:0000:0000:0000|/sign-out",
];

function localDatabaseConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured for E2E tests.");
  }

  const databaseUrl = new URL(connectionString);
  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname)
  ) {
    throw new Error("E2E tests require a local PostgreSQL database.");
  }

  return connectionString;
}

async function resetLocalAuthRateLimits() {
  const client = new Client({
    connectionString: localDatabaseConnectionString(),
  });
  await client.connect();

  try {
    await client.query(
      'DELETE FROM "AuthRateLimit" WHERE "key" = ANY($1::text[])',
      [LOCAL_AUTH_RATE_LIMIT_KEYS],
    );
  } finally {
    await client.end();
  }
}

export function createTestEmail() {
  return `e2e-${randomUUID()}@example.invalid`;
}

export function collectBrowserProblems(page: Page) {
  const problems: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`console ${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    problems.push(`page error: ${error.message}`);
  });

  return problems;
}

export async function registerAndOnboard(page: Page, email: string) {
  await resetLocalAuthRateLimits();
  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: "Buat akunmu" }),
  ).toBeVisible();

  await page.getByLabel("Nama", { exact: true }).fill("Uji E2E");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Finara-e2e-2026");
  await page.getByRole("button", { name: "Lanjut siapkan akun" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Nama akun", { exact: true }).fill("BCA E2E");
  await page
    .getByRole("spinbutton", { name: /Saldo saat ini/ })
    .fill("1000000");
  await page.getByRole("button", { name: "Selesai dan buka Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Halo, Uji", exact: true }),
  ).toBeVisible();
}

export async function deleteTestUser(email: string) {
  if (!TEST_EMAIL_PATTERN.test(email)) {
    throw new Error(`Refusing to delete a non-E2E user: ${email}`);
  }

  const client = new Client({
    connectionString: localDatabaseConnectionString(),
  });
  await client.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      'SELECT "id" FROM "User" WHERE "email" = $1 FOR UPDATE',
      [email],
    );
    const userId = result.rows[0]?.id;

    if (userId) {
      await client.query('DELETE FROM "Transaction" WHERE "userId" = $1', [
        userId,
      ]);
      await client.query('DELETE FROM "Budget" WHERE "userId" = $1', [userId]);
      await client.query('DELETE FROM "Account" WHERE "userId" = $1', [
        userId,
      ]);
      await client.query('DELETE FROM "Category" WHERE "userId" = $1', [
        userId,
      ]);
      await client.query('DELETE FROM "User" WHERE "id" = $1', [userId]);
    }

    await client.query(
      'DELETE FROM "AuthRateLimit" WHERE "key" = ANY($1::text[])',
      [LOCAL_AUTH_RATE_LIMIT_KEYS],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

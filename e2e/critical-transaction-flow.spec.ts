import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { Client } from "pg";

const TEST_EMAIL_PATTERN = /^e2e-[a-f0-9-]+@example\.invalid$/;

async function deleteTestUser(email: string) {
  if (!TEST_EMAIL_PATTERN.test(email)) {
    throw new Error(`Refusing to delete a non-E2E user: ${email}`);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured for E2E cleanup.");
  }

  const client = new Client({ connectionString });
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
      await client.query('DELETE FROM "Account" WHERE "userId" = $1', [userId]);
      await client.query('DELETE FROM "Category" WHERE "userId" = $1', [userId]);
      await client.query('DELETE FROM "User" WHERE "id" = $1', [userId]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

test(
  "a new mobile user can record and find a manual expense",
  async ({ page }, testInfo) => {
    const email = `e2e-${randomUUID()}@example.invalid`;
    const browserProblems: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        browserProblems.push(`console ${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      browserProblems.push(`page error: ${error.message}`);
    });

    try {
      await page.goto("/register");
      await expect(
        page.getByRole("heading", { name: "Buat akunmu" }),
      ).toBeVisible();

      await page.getByLabel("Nama", { exact: true }).fill("Uji E2E");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page
        .getByLabel("Password", { exact: true })
        .fill("Finara-e2e-2026");
      await page.getByRole("button", { name: "Lanjut siapkan akun" }).click();

      await expect(page).toHaveURL(/\/onboarding$/);
      await page.getByLabel("Nama akun", { exact: true }).fill("BCA E2E");
      await page
        .getByRole("spinbutton", { name: /Saldo saat ini/ })
        .fill("1000000");
      await page
        .getByRole("button", { name: "Selesai dan buka Home" })
        .click();

      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("heading", { name: "Halo, Uji" }),
      ).toBeVisible();
      await expect(page.getByText("Rp1.000.000", { exact: true })).toBeVisible();

      await page
        .getByRole("button", { name: "Buka formulir transaksi manual" })
        .click();
      const dialog = page.getByRole("dialog", { name: "Tinjau transaksi" });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Deskripsi", { exact: true }).fill("Makan ayam");
      await dialog.getByLabel("Nominal", { exact: true }).fill("25000");
      await dialog
        .getByRole("combobox", { name: "Kategori", exact: true })
        .selectOption({ label: "Food & Drink" });
      await dialog.getByRole("button", { name: "Simpan transaksi" }).click();

      await expect(page.getByRole("status")).toContainText(
        "Makan ayam berhasil dicatat.",
      );
      await expect(page.getByRole("link", { name: /Makan ayam/ })).toBeVisible();

      await page
        .getByRole("navigation", { name: "Navigasi utama" })
        .getByRole("link", { name: "Aktivitas", exact: true })
        .click();
      await expect(page).toHaveURL(/\/activity$/);
      await expect(
        page.getByRole("heading", { name: "Aktivitas", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /Makan ayam/ })).toBeVisible();

      const screenshot = testInfo.outputPath("mobile-activity.png");
      await page.screenshot({ fullPage: true, path: screenshot });
      await testInfo.attach("mobile-activity", {
        path: screenshot,
      });

      expect(browserProblems).toEqual([]);
    } finally {
      await deleteTestUser(email);
    }
  },
);

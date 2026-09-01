import { writeFile } from "node:fs/promises";

import { expect, type Page, test } from "@playwright/test";

import {
  financeSnapshotDtoSchema,
  getDateKeyInTimeZone,
  getMonthKeyInTimeZone,
} from "../src/lib/transactions";
import {
  collectBrowserProblems,
  createTestEmail,
  deleteTestUser,
  registerAndOnboard,
} from "./support/test-user";

async function recordManualExpense(
  page: Page,
  description: string,
  amount: string,
) {
  await page
    .getByRole("button", { name: "Buka formulir transaksi manual" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Tinjau transaksi" });
  await dialog.getByLabel("Deskripsi", { exact: true }).fill(description);
  await dialog.getByLabel("Nominal", { exact: true }).fill(amount);
  await dialog
    .getByRole("combobox", { name: "Kategori", exact: true })
    .selectOption({ label: "Food & Drink" });
  await dialog.getByRole("button", { name: "Simpan transaksi" }).click();
  await expect(page.getByRole("status")).toContainText(
    `${description} berhasil dicatat.`,
  );
}

test(
  "transaction edit and confirmed delete reconcile Home and Activity",
  async ({ page }) => {
    const email = createTestEmail();
    const browserProblems = collectBrowserProblems(page);

    try {
      await registerAndOnboard(page, email);
      await recordManualExpense(page, "Makan awal", "25000");

      await page.getByRole("link", { name: /Makan awal/ }).click();
      await expect(page).toHaveURL(/\/activity\/[a-f0-9-]+$/);
      await page.getByRole("button", { name: "Edit", exact: true }).click();

      const editDialog = page.getByRole("dialog", {
        name: "Edit transaksi",
      });
      await editDialog
        .getByLabel("Deskripsi", { exact: true })
        .fill("Makan diperbarui");
      await editDialog.getByLabel("Nominal", { exact: true }).fill("40000");
      await editDialog
        .getByRole("button", { name: "Simpan perubahan" })
        .click();
      await expect(page.getByRole("status")).toContainText(
        "Makan diperbarui berhasil diperbarui.",
      );

      const navigation = page.getByRole("navigation", {
        name: "Navigasi utama",
      });
      await navigation.getByRole("link", { name: "Home", exact: true }).click();
      await expect(page.getByText("Rp960.000", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Makan diperbarui.*Rp40\.000/ }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /Makan awal/ })).toHaveCount(0);

      await page.getByRole("link", { name: /Makan diperbarui/ }).click();
      await page.getByRole("button", { name: "Hapus", exact: true }).click();
      const deleteDialog = page.getByRole("alertdialog", {
        name: "Hapus transaksi?",
      });
      await deleteDialog
        .getByRole("button", { name: "Hapus transaksi" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Transaksi dihapus" }),
      ).toBeVisible();
      await page
        .getByRole("main")
        .getByRole("link", { name: "Kembali ke Aktivitas" })
        .click();
      await expect(page.getByRole("link", { name: /Makan diperbarui/ })).toHaveCount(
        0,
      );

      await navigation.getByRole("link", { name: "Home", exact: true }).click();
      await expect(page.getByText("Rp1.000.000", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Belum ada aktivitas" }),
      ).toBeVisible();
      expect(browserProblems).toEqual([]);
    } finally {
      await deleteTestUser(email);
    }
  },
);

test(
  "account rename persists and sign-out revokes the private session",
  async ({ page }) => {
    const email = createTestEmail();
    const browserProblems = collectBrowserProblems(page);

    try {
      await registerAndOnboard(page, email);
      await page
        .getByRole("navigation", { name: "Navigasi utama" })
        .getByRole("link", { name: "Profil", exact: true })
        .click();
      await page.getByRole("link", { name: /Akun & kategori/ }).click();

      await page
        .getByRole("button", { name: "Ubah nama akun BCA E2E" })
        .click();
      const renameDialog = page.getByRole("dialog", { name: "Ubah nama akun" });
      await renameDialog
        .getByLabel("Nama akun", { exact: true })
        .fill("BCA Utama E2E");
      await renameDialog.getByRole("button", { name: "Simpan" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Nama akun berhasil diperbarui.",
      );

      await page.reload();
      await expect(page.getByText("BCA Utama E2E", { exact: true })).toBeVisible();
      await page.getByRole("link", { name: "Kembali ke profil" }).click();
      await expect(page.getByText(/Utama: BCA Utama E2E/)).toBeVisible();

      await page.getByRole("button", { name: "Keluar", exact: true }).click();
      await expect(page).toHaveURL(/\/welcome$/);
      await expect(
        page.getByRole("heading", {
          name: "Catat cepat. Pahami uangmu dengan tenang.",
        }),
      ).toBeVisible();
      await page.goto("/");
      await expect(page).toHaveURL(/\/welcome$/);
      expect(browserProblems).toEqual([]);
    } finally {
      await deleteTestUser(email);
    }
  },
);

test(
  "AI preview and current-month answer render through a deterministic boundary",
  async ({ context, page }, testInfo) => {
    const email = createTestEmail();
    const browserProblems = collectBrowserProblems(page);

    try {
      await registerAndOnboard(page, email);

      const now = new Date();
      const snapshotResponse = await context.request.get(
        `/api/finance/snapshot?month=${getMonthKeyInTimeZone(now)}`,
      );
      expect(snapshotResponse.status()).toBe(200);
      const snapshotEnvelope: unknown = await snapshotResponse.json();
      if (
        !snapshotEnvelope ||
        typeof snapshotEnvelope !== "object" ||
        !("data" in snapshotEnvelope)
      ) {
        throw new Error("Finance snapshot response is missing its data envelope.");
      }
      const snapshot = financeSnapshotDtoSchema.parse(snapshotEnvelope.data);
      const account = snapshot.accounts[0];
      const category = snapshot.categories.find(
        (item) => item.type === "EXPENSE" && item.name === "Food & Drink",
      );
      if (!account || !category) {
        throw new Error("Onboarding did not create the AI preview references.");
      }

      await page.route(
        "**/api/ai/composer-responses",
        async (route) => {
          expect(route.request().postDataJSON()).toEqual({ text: "Makan 25rb" });
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                kind: "transaction_preview",
                preview: {
                  status: "ready",
                  draft: {
                    accountId: account.id,
                    accountName: account.name,
                    amount: "25000",
                    categoryId: category.id,
                    categoryName: category.name,
                    description: "Makan",
                    transactionDate: getDateKeyInTimeZone(now),
                    transactionTime: null,
                    type: "EXPENSE",
                  },
                },
              },
            }),
          });
        },
        { times: 1 },
      );

      const composerInput = page.getByLabel("Tulis transaksi atau pertanyaan");
      await composerInput.fill("Makan 25rb");
      const parsingStartedAt = Date.now();
      await page.getByRole("button", { name: "Proses dengan Finara" }).click();
      const previewDialog = page.getByRole("dialog", { name: "Tinjau transaksi" });
      await expect(previewDialog).toBeVisible();
      const parsingMs = Date.now() - parsingStartedAt;
      await expect(
        previewDialog.getByLabel("Nominal", { exact: true }),
      ).toHaveValue("25000");
      await expect(
        previewDialog.getByLabel("Deskripsi", { exact: true }),
      ).toHaveValue("Makan");

      const persistenceStartedAt = Date.now();
      await previewDialog
        .getByRole("button", { name: "Simpan transaksi" })
        .click();
      await expect(page.getByRole("status")).toContainText(
        "Makan berhasil dicatat.",
      );
      const persistenceMs = Date.now() - persistenceStartedAt;
      expect(parsingMs + persistenceMs).toBeLessThan(10_000);

      await page.route(
        "**/api/ai/composer-responses",
        async (route) => {
          expect(route.request().postDataJSON()).toEqual({
            text: "Pengeluaran bulan ini?",
          });
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                kind: "finance_answer",
                label: "Pengeluaran bulan ini",
                value: "Rp25.000",
                detail: "Dari 1 transaksi tersimpan.",
              },
            }),
          });
        },
        { times: 1 },
      );
      await composerInput.fill("Pengeluaran bulan ini?");
      await page.getByRole("button", { name: "Proses dengan Finara" }).click();
      const answer = page.locator(".composer-answer");
      await expect(answer).toContainText("Pengeluaran bulan ini");
      await expect(answer).toContainText("Rp25.000");
      await expect(answer).toContainText("Dari 1 transaksi tersimpan.");

      const timingPath = testInfo.outputPath("transaction-timing.json");
      await writeFile(
        timingPath,
        JSON.stringify(
          {
            profile: "Pixel 7 / Edge / loopback PostgreSQL",
            parsingMs,
            persistenceMs,
            totalMs: parsingMs + persistenceMs,
          },
          null,
          2,
        ),
        "utf8",
      );
      await testInfo.attach("transaction-timing", { path: timingPath });
      expect(browserProblems).toEqual([]);
    } finally {
      await deleteTestUser(email);
    }
  },
);

test(
  "the mobile information architecture remains intact at 320px and 1440px",
  async ({ page }, testInfo) => {
    const email = createTestEmail();
    const browserProblems = collectBrowserProblems(page);
    const viewports = [
      { name: "narrow-320", width: 320, height: 700 },
      { name: "large-1440", width: 1_440, height: 900 },
    ] as const;
    const routes = [
      { path: "/", heading: "Halo, Uji" },
      { path: "/activity", heading: "Aktivitas" },
      { path: "/budget", heading: "Anggaran" },
      { path: "/profile", heading: "Profil" },
    ] as const;

    try {
      await registerAndOnboard(page, email);

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);

        for (const route of routes) {
          await page.goto(route.path);
          await expect(
            page.getByRole("heading", { name: route.heading, exact: true }),
          ).toBeVisible();
          const navigation = page.getByRole("navigation", {
            name: "Navigasi utama",
          });
          await expect(navigation).toHaveCount(1);
          await expect(navigation.getByRole("link")).toHaveCount(4);

          const dimensions = await page.evaluate(() => {
            const shell = document.querySelector<HTMLElement>(".app-shell");
            return {
              documentClientWidth: document.documentElement.clientWidth,
              documentScrollWidth: document.documentElement.scrollWidth,
              shellWidth: shell?.getBoundingClientRect().width ?? 0,
            };
          });
          expect(dimensions.documentScrollWidth).toBeLessThanOrEqual(
            dimensions.documentClientWidth,
          );
          expect(dimensions.shellWidth).toBeGreaterThan(0);
          expect(dimensions.shellWidth).toBeLessThanOrEqual(480);
        }

        await page.goto("/");
        const composerButton = page.getByRole("button", {
          name: "Buka formulir transaksi manual",
        });
        await composerButton.scrollIntoViewIfNeeded();
        await expect(composerButton).toBeVisible();
        const screenshot = testInfo.outputPath(`${viewport.name}-home.png`);
        await page.screenshot({ fullPage: true, path: screenshot });
        await testInfo.attach(`${viewport.name}-home`, { path: screenshot });
      }

      expect(browserProblems).toEqual([]);
    } finally {
      await deleteTestUser(email);
    }
  },
);

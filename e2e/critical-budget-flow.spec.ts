import { expect, test } from "@playwright/test";

import {
  collectBrowserProblems,
  createTestEmail,
  deleteTestUser,
  registerAndOnboard,
} from "./support/test-user";

const EXPECTED_SAVE_FAILURE_CONSOLE =
  "console error: Failed to load resource: the server responded with a status of 503 (Service Unavailable)";

test(
  "a new mobile user can create and reload a category budget",
  async ({ page }, testInfo) => {
    const email = createTestEmail();
    const browserProblems = collectBrowserProblems(page);

    try {
      await registerAndOnboard(page, email);
      await expect(page).toHaveURL(/\/$/);

      await page
        .getByRole("navigation", { name: "Navigasi utama" })
        .getByRole("link", { name: "Anggaran", exact: true })
        .click();

      await expect(page).toHaveURL(/\/budget$/);
      await expect(
        page.getByRole("heading", { name: "Anggaran", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Belum ada batas pengeluaran untuk bulan ini."),
      ).toBeVisible();

      await page
        .getByRole("button", { name: "Atur anggaran pertama" })
        .click();
      const dialog = page.getByRole("dialog", { name: "Atur anggaran" });
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("combobox", { name: "Kategori", exact: true })
        .selectOption({ label: "Food & Drink" });
      await dialog
        .getByLabel("Alokasi bulanan", { exact: true })
        .fill("750000");
      await dialog.getByRole("button", { name: "Tambah anggaran" }).click();

      await expect(page.getByRole("status")).toContainText(
        "Food & Drink berhasil ditambahkan.",
      );
      await expect(dialog).toBeHidden();
      const budget = page.getByRole("article").filter({
        has: page.getByRole("heading", { name: "Food & Drink", exact: true }),
      });
      await expect(budget).toHaveCount(1);
      await expect(budget).toContainText("Rp0 / Rp750 rb");
      await expect(
        budget.getByRole("progressbar", { name: "Food & Drink terpakai" }),
      ).toHaveAttribute("aria-valuetext", "Rp0 dari Rp750.000. Belum terpakai.");

      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Anggaran", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("article").filter({
          has: page.getByRole("heading", {
            name: "Food & Drink",
            exact: true,
          }),
        }),
      ).toHaveCount(1);

      const screenshot = testInfo.outputPath("mobile-budget.png");
      await page.screenshot({ fullPage: true, path: screenshot });
      await testInfo.attach("mobile-budget", { path: screenshot });

      expect(browserProblems).toEqual([]);
    } finally {
      await deleteTestUser(email);
    }
  },
);

test(
  "an ambiguous Budget save preserves the draft and retries idempotently",
  async ({ page }, testInfo) => {
    const email = createTestEmail();
    const browserProblems = collectBrowserProblems(page);

    try {
      await registerAndOnboard(page, email);
      await expect(page).toHaveURL(/\/$/);
      await page
        .getByRole("navigation", { name: "Navigasi utama" })
        .getByRole("link", { name: "Anggaran", exact: true })
        .click();

      await expect(page).toHaveURL(/\/budget$/);
      await page
        .getByRole("button", { name: "Atur anggaran pertama" })
        .click();
      const dialog = page.getByRole("dialog", { name: "Atur anggaran" });
      const category = dialog.getByRole("combobox", {
        name: "Kategori",
        exact: true,
      });
      const amount = dialog.getByLabel("Alokasi bulanan", { exact: true });
      await category.selectOption({ label: "Food & Drink" });
      await amount.fill("800000");

      let initialPayload = null;
      let persistedStatus;
      await page.route(
        "**/api/budgets",
        async (route) => {
          initialPayload = route.request().postData();
          const response = await route.fetch();
          persistedStatus = response.status();
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                code: "INTERNAL_ERROR",
                message: "Terjadi kesalahan. Coba lagi.",
              },
            }),
          });
        },
        { times: 1 },
      );

      await dialog.getByRole("button", { name: "Tambah anggaran" }).click();

      await expect(dialog.getByRole("alert")).toHaveText(
        "Terjadi kesalahan. Coba lagi.",
      );
      expect(persistedStatus).toBe(201);
      await expect(category).toHaveValue(/.+/);
      await expect(category.locator("option:checked")).toHaveText(
        "Food & Drink",
      );
      await expect(amount).toHaveValue("800000");

      const screenshot = testInfo.outputPath("mobile-budget-save-failure.png");
      await page.screenshot({ fullPage: true, path: screenshot });
      await testInfo.attach("mobile-budget-save-failure", { path: screenshot });

      const retryRequestPromise = page.waitForRequest(
        (request) =>
          request.method() === "POST" &&
          new URL(request.url()).pathname === "/api/budgets",
      );
      await dialog.getByRole("button", { name: "Coba lagi" }).click();
      const retryRequest = await retryRequestPromise;

      await expect(page.getByRole("status")).toContainText(
        "Food & Drink berhasil ditambahkan.",
      );
      expect(retryRequest.postData()).toBe(initialPayload);
      await expect(dialog).toBeHidden();
      const budgets = page.getByRole("article").filter({
        has: page.getByRole("heading", { name: "Food & Drink", exact: true }),
      });
      await expect(budgets).toHaveCount(1);
      await expect(budgets).toContainText("Rp0 / Rp800 rb");
      expect(browserProblems).toEqual([EXPECTED_SAVE_FAILURE_CONSOLE]);
    } finally {
      await deleteTestUser(email);
    }
  },
);

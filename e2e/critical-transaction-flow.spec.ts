import { expect, test } from "@playwright/test";

import {
  collectBrowserProblems,
  createTestEmail,
  deleteTestUser,
  registerAndOnboard,
} from "./support/test-user";

const EXPECTED_SAVE_FAILURE_CONSOLE =
  "console error: Failed to load resource: the server responded with a status of 503 (Service Unavailable)";

function readClientRequestId(postData: string | null) {
  const body: unknown = postData ? JSON.parse(postData) : null;
  if (
    !body ||
    typeof body !== "object" ||
    !("clientRequestId" in body) ||
    typeof body.clientRequestId !== "string"
  ) {
    throw new Error("Transaction request is missing its idempotency key.");
  }
  return body.clientRequestId;
}

test(
  "a new mobile user can record and find a manual expense",
  async ({ page }, testInfo) => {
    const email = createTestEmail();
    const browserProblems = collectBrowserProblems(page);

    try {
      await registerAndOnboard(page, email);

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

test(
  "a failed manual save preserves the draft and retries without a duplicate",
  async ({ page }, testInfo) => {
    const email = createTestEmail();
    const browserProblems = collectBrowserProblems(page);

    try {
      await registerAndOnboard(page, email);

      await expect(page).toHaveURL(/\/$/);
      await page
        .getByRole("button", { name: "Buka formulir transaksi manual" })
        .click();
      const dialog = page.getByRole("dialog", { name: "Tinjau transaksi" });
      const description = dialog.getByLabel("Deskripsi", { exact: true });
      const amount = dialog.getByLabel("Nominal", { exact: true });
      const category = dialog.getByRole("combobox", {
        name: "Kategori",
        exact: true,
      });
      await description.fill("Makan retry");
      await amount.fill("25000");
      await category.selectOption({ label: "Food & Drink" });

      let initialClientRequestId: string | undefined;
      let persistedStatus: number | undefined;
      await page.route(
        "**/api/transactions",
        async (route) => {
          initialClientRequestId = readClientRequestId(
            route.request().postData(),
          );
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

      await dialog.getByRole("button", { name: "Simpan transaksi" }).click();

      await expect(dialog.getByRole("alert")).toHaveText(
        "Transaksi belum tersimpan. Coba lagi.",
      );
      expect(persistedStatus).toBe(201);
      await expect(description).toHaveValue("Makan retry");
      await expect(amount).toHaveValue("25000");
      await expect(category).toHaveValue(/.+/);

      const screenshot = testInfo.outputPath("mobile-save-failure.png");
      await page.screenshot({ fullPage: true, path: screenshot });
      await testInfo.attach("mobile-save-failure", { path: screenshot });

      const retryRequestPromise = page.waitForRequest(
        (request) =>
          request.method() === "POST" &&
          new URL(request.url()).pathname === "/api/transactions",
      );
      await dialog.getByRole("button", { name: "Coba lagi" }).click();
      const retryRequest = await retryRequestPromise;

      await expect(page.getByRole("status")).toContainText(
        "Makan retry berhasil dicatat.",
      );
      expect(readClientRequestId(retryRequest.postData())).toBe(
        initialClientRequestId,
      );
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("link", { name: /Makan retry/ })).toHaveCount(
        1,
      );
      expect(browserProblems).toEqual([EXPECTED_SAVE_FAILURE_CONSOLE]);
    } finally {
      await deleteTestUser(email);
    }
  },
);

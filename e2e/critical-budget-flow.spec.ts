import { expect, test } from "@playwright/test";

import {
  collectBrowserProblems,
  createTestEmail,
  deleteTestUser,
  registerAndOnboard,
} from "./support/test-user";

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

import { expect, type Page } from "@playwright/test";

export function readClientRequestId(postData: string | null) {
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

export async function recordManualExpense(
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

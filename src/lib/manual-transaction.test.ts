import { describe, expect, it } from "vitest";

import type { FinanceAccount } from "./accounts";
import type { FinanceCategory } from "./finance-query";
import { createManualTransactionDraft } from "./manual-transaction";

const accounts: FinanceAccount[] = [
  {
    id: "account-primary",
    name: "BCA",
    type: "BANK",
    currentBalance: 1_000_000,
  },
  {
    id: "account-cash",
    name: "Cash",
    type: "CASH",
    currentBalance: 100_000,
  },
];

const categories: FinanceCategory[] = [
  { id: "category-food", name: "Food & Drink", type: "EXPENSE" },
  { id: "category-expense-other", name: "Other", type: "EXPENSE" },
  { id: "category-income-other", name: "Other", type: "INCOME" },
  { id: "category-salary", name: "Salary", type: "INCOME" },
];

describe("createManualTransactionDraft", () => {
  it("creates an empty expense draft with safe manual defaults", () => {
    expect(
      createManualTransactionDraft({
        accounts,
        categories,
        referenceDate: "2026-08-30",
      }),
    ).toEqual({
      account: "BCA",
      accountId: "account-primary",
      amount: 0,
      category: "Other",
      categoryId: "category-expense-other",
      date: "2026-08-30",
      description: "Transaksi",
      type: "EXPENSE",
    });
  });

  it("prefills a locally parseable recovery text and matching category", () => {
    expect(
      createManualTransactionDraft({
        accounts,
        categories,
        referenceDate: "2026-08-30",
        text: "makan ayam 25rb",
      }),
    ).toEqual({
      account: "BCA",
      accountId: "account-primary",
      amount: 25_000,
      category: "Food & Drink",
      categoryId: "category-food",
      date: "2026-08-30",
      description: "Makan ayam",
      type: "EXPENSE",
    });
  });

  it("preserves unparseable recovery text in an editable expense draft", () => {
    expect(
      createManualTransactionDraft({
        accounts,
        categories,
        referenceDate: "2026-08-30",
        text: "  makan ayam  ",
      }),
    ).toMatchObject({
      amount: 0,
      categoryId: "category-expense-other",
      description: "makan ayam",
      type: "EXPENSE",
    });
  });

  it("returns null when an account or compatible category is unavailable", () => {
    expect(
      createManualTransactionDraft({
        accounts: [],
        categories,
        referenceDate: "2026-08-30",
      }),
    ).toBeNull();
    expect(
      createManualTransactionDraft({
        accounts,
        categories: categories.filter((category) => category.type === "INCOME"),
        referenceDate: "2026-08-30",
      }),
    ).toBeNull();
  });
});

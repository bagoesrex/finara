import { describe, expect, it, vi } from "bun:test";

import { resolveAiComposerIntent } from "./ai-composer-resolution";

const context = {
  accounts: [{ id: "account-1", name: "BCA" }],
  categories: [
    { id: "expense-1", name: "Food & Drink", type: "EXPENSE" as const },
    { id: "income-1", name: "Salary", type: "INCOME" as const },
  ],
  referenceDate: "2026-08-30",
};

describe("AI composer intent resolution", () => {
  it("turns a transaction intent into the existing confirmation preview", async () => {
    const executeFinanceRead = vi.fn();

    await expect(
      resolveAiComposerIntent(
        {
          intent: "CREATE_TRANSACTION",
          type: "EXPENSE",
          amount: "25000",
          description: "Makan ayam",
          categoryHint: "Food & Drink",
          transactionDate: "2026-08-30",
          transactionTime: null,
          missingFields: [],
        },
        context,
        executeFinanceRead,
      ),
    ).resolves.toMatchObject({
      kind: "transaction_preview",
      preview: {
        status: "ready",
        draft: {
          accountId: "account-1",
          categoryId: "expense-1",
          amount: "25000",
        },
      },
    });
    expect(executeFinanceRead).not.toHaveBeenCalled();
  });

  it("delegates only allowlisted read intents to the authorized server tool", async () => {
    const answer = {
      kind: "finance_answer" as const,
      label: "Saldo tersedia",
      value: "Rp500.000",
      detail: "Dari 1 akun.",
    };
    const executeFinanceRead = vi.fn(async () => answer);
    const intent = { intent: "GET_BALANCE" as const };

    await expect(
      resolveAiComposerIntent(intent, context, executeFinanceRead),
    ).resolves.toEqual(answer);
    expect(executeFinanceRead).toHaveBeenCalledTimes(1);
    expect(executeFinanceRead).toHaveBeenCalledWith(intent);
  });

  it("rejects unsupported requests without executing a financial query", async () => {
    const executeFinanceRead = vi.fn();

    await expect(
      resolveAiComposerIntent(
        { intent: "UNSUPPORTED" },
        context,
        executeFinanceRead,
      ),
    ).resolves.toEqual({
      kind: "unsupported",
      message:
        "Saat ini Finara bisa mencatat transaksi dan menjawab ringkasan bulan ini.",
    });
    expect(executeFinanceRead).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";

import {
  applyTransactionToSummary,
  changeDraftType,
  filterTransactions,
  formatCompactCurrency,
  formatCurrency,
  groupTransactionsByDate,
  parseTransactionInput,
} from "./finance";

const transactions = [
  {
    id: "trx-1",
    description: "Kopi susu",
    category: "Food & Drink",
    account: "GoPay",
    amount: 18_000,
    type: "EXPENSE" as const,
    date: "2026-08-25",
    time: "08:20",
  },
  {
    id: "trx-2",
    description: "Gaji Agustus",
    category: "Salary",
    account: "BCA",
    amount: 5_000_000,
    type: "INCOME" as const,
    date: "2026-08-24",
    time: "09:00",
  },
];

describe("currency formatting", () => {
  it("formats an IDR amount without decimal noise", () => {
    expect(formatCurrency(25_000)).toBe("Rp25.000");
  });

  it("uses Indonesian compact units", () => {
    expect(formatCompactCurrency(580_000)).toBe("Rp580 rb");
    expect(formatCompactCurrency(1_420_000)).toBe("Rp1,42 jt");
  });
});

describe("parseTransactionInput", () => {
  it("parses an expense with ribu shorthand", () => {
    expect(parseTransactionInput("makan ayam 25rb", "2026-08-25")).toEqual({
      status: "ready",
      transaction: {
        amount: 25_000,
        category: "Food & Drink",
        date: "2026-08-25",
        description: "Makan ayam",
        type: "EXPENSE",
      },
    });
  });

  it("parses salary income with juta shorthand", () => {
    expect(parseTransactionInput("gaji masuk 5jt", "2026-08-25")).toEqual({
      status: "ready",
      transaction: {
        amount: 5_000_000,
        category: "Salary",
        date: "2026-08-25",
        description: "Gaji masuk",
        type: "INCOME",
      },
    });
  });

  it("keeps ambiguous input recoverable", () => {
    expect(parseTransactionInput("makan ayam", "2026-08-25")).toEqual({
      status: "invalid",
      message: "Tambahkan nominal, misalnya 25rb.",
    });
  });

  it("resolves relative date and time hints without leaving them in the description", () => {
    expect(
      parseTransactionInput("kemarin beli bensin 50 ribu", "2026-08-25"),
    ).toEqual({
      status: "ready",
      transaction: {
        amount: 50_000,
        category: "Transport",
        date: "2026-08-24",
        description: "Beli bensin",
        type: "EXPENSE",
      },
    });

    expect(parseTransactionInput("grab 22rb tadi pagi", "2026-08-25")).toEqual({
      status: "ready",
      transaction: {
        amount: 22_000,
        category: "Transport",
        date: "2026-08-25",
        description: "Grab",
        time: "08:00",
        type: "EXPENSE",
      },
    });
  });

  it("maps common bill shorthand to the matching category", () => {
    expect(parseTransactionInput("bayar wifi 350k", "2026-08-25")).toMatchObject({
      status: "ready",
      transaction: { amount: 350_000, category: "Bills" },
    });
  });
});

describe("editable transaction draft", () => {
  it("resets an incompatible category when the transaction type changes", () => {
    expect(
      changeDraftType(
        {
          amount: 25_000,
          category: "Food & Drink",
          date: "2026-08-25",
          description: "Makan ayam",
          type: "EXPENSE",
        },
        "INCOME",
      ),
    ).toMatchObject({ type: "INCOME", category: "Other" });
  });
});

describe("financial summary updates", () => {
  const summary = {
    available: 4_250_000,
    spentThisMonth: 1_420_000,
    incomeThisMonth: 5_670_000,
    monthKey: "2026-08",
    monthLabel: "Agustus 2026",
  };

  it("updates available balance and current-month spending for an expense", () => {
    expect(
      applyTransactionToSummary(summary, {
        amount: 25_000,
        date: "2026-08-25",
        type: "EXPENSE",
      }),
    ).toEqual({
      ...summary,
      available: 4_225_000,
      spentThisMonth: 1_445_000,
    });
  });

  it("does not add an older expense to the current-month spending total", () => {
    expect(
      applyTransactionToSummary(summary, {
        amount: 25_000,
        date: "2026-07-31",
        type: "EXPENSE",
      }),
    ).toEqual({ ...summary, available: 4_225_000 });
  });

  it("updates available balance and current-month income for income", () => {
    expect(
      applyTransactionToSummary(summary, {
        amount: 500_000,
        date: "2026-08-25",
        type: "INCOME",
      }),
    ).toEqual({
      ...summary,
      available: 4_750_000,
      incomeThisMonth: 6_170_000,
    });
  });
});

describe("transaction discovery", () => {
  it("searches description, category, account, and normalized amount", () => {
    expect(filterTransactions(transactions, "kopi")).toHaveLength(1);
    expect(filterTransactions(transactions, "salary")).toHaveLength(1);
    expect(filterTransactions(transactions, "gopay")).toHaveLength(1);
    expect(filterTransactions(transactions, "18000")).toHaveLength(1);
  });

  it("groups dates newest first while preserving records", () => {
    expect(groupTransactionsByDate(transactions)).toEqual([
      { date: "2026-08-25", transactions: [transactions[0]] },
      { date: "2026-08-24", transactions: [transactions[1]] },
    ]);
  });
});

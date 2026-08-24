import { describe, expect, it } from "vitest";

import {
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
    expect(parseTransactionInput("makan ayam 25rb")).toEqual({
      status: "ready",
      transaction: {
        amount: 25_000,
        category: "Food & Drink",
        description: "Makan ayam",
        type: "EXPENSE",
      },
    });
  });

  it("parses salary income with juta shorthand", () => {
    expect(parseTransactionInput("gaji masuk 5jt")).toEqual({
      status: "ready",
      transaction: {
        amount: 5_000_000,
        category: "Salary",
        description: "Gaji masuk",
        type: "INCOME",
      },
    });
  });

  it("keeps ambiguous input recoverable", () => {
    expect(parseTransactionInput("makan ayam")).toEqual({
      status: "invalid",
      message: "Tambahkan nominal, misalnya 25rb.",
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

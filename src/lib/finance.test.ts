import { describe, expect, it } from "bun:test";

import {
  changeDraftType,
  formatCompactCurrency,
  formatCurrency,
  formatSignedCurrency,
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
    expect(formatCurrency(BigInt("9007199254740993"))).toBe(
      "Rp9.007.199.254.740.993",
    );
  });

  it("uses Indonesian compact units", () => {
    expect(formatCompactCurrency(580_000)).toBe("Rp580 rb");
    expect(formatCompactCurrency(1_420_000)).toBe("Rp1,42 jt");
    expect(formatCompactCurrency(BigInt("9007199254740993"))).toBe(
      "Rp9.007.199.254,74 jt",
    );
  });

  it("preserves a negative sign for signed balances", () => {
    expect(formatSignedCurrency(-25_000)).toBe("−Rp25.000");
    expect(formatSignedCurrency(25_000)).toBe("Rp25.000");
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

describe("transaction discovery", () => {
  it("groups dates newest first while preserving records", () => {
    expect(groupTransactionsByDate(transactions)).toEqual([
      { date: "2026-08-25", transactions: [transactions[0]] },
      { date: "2026-08-24", transactions: [transactions[1]] },
    ]);
  });
});

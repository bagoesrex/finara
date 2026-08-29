import { describe, expect, it } from "vitest";

import {
  applyTransactionToSummary,
  calculateBudgetOverview,
  changeDraftType,
  filterTransactions,
  formatCompactCurrency,
  formatCurrency,
  formatSignedCurrency,
  groupTransactionsByDate,
  parseTransactionInput,
  removeTransactionFromSummary,
  replaceTransactionInSummary,
  upsertBudgetAllocation,
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

  it("reverses a current-month expense when it is deleted", () => {
    expect(
      removeTransactionFromSummary(summary, {
        amount: 25_000,
        date: "2026-08-25",
        type: "EXPENSE",
      }),
    ).toEqual({
      ...summary,
      available: 4_275_000,
      spentThisMonth: 1_395_000,
    });
  });

  it("recalculates the delta when an expense amount is edited", () => {
    expect(
      replaceTransactionInSummary(
        summary,
        { amount: 25_000, date: "2026-08-25", type: "EXPENSE" },
        { amount: 40_000, date: "2026-08-25", type: "EXPENSE" },
      ),
    ).toEqual({
      ...summary,
      available: 4_235_000,
      spentThisMonth: 1_435_000,
    });
  });

  it("moves totals between expense and income when the type is edited", () => {
    expect(
      replaceTransactionInSummary(
        summary,
        { amount: 25_000, date: "2026-08-25", type: "EXPENSE" },
        { amount: 500_000, date: "2026-08-25", type: "INCOME" },
      ),
    ).toEqual({
      ...summary,
      available: 4_775_000,
      spentThisMonth: 1_395_000,
      incomeThisMonth: 6_170_000,
    });
  });

  it("removes spending from the active month when the date is moved back", () => {
    expect(
      replaceTransactionInSummary(
        summary,
        { amount: 25_000, date: "2026-08-25", type: "EXPENSE" },
        { amount: 25_000, date: "2026-07-31", type: "EXPENSE" },
      ),
    ).toEqual({
      ...summary,
      spentThisMonth: 1_395_000,
    });
  });
});

describe("budget calculations", () => {
  const allocations = [
    {
      id: "budget-food",
      category: "Food & Drink",
      amount: 20_000,
      monthKey: "2026-08",
    },
    {
      id: "budget-transport",
      category: "Transport",
      amount: 50_000,
      monthKey: "2026-08",
    },
  ];

  const budgetTransactions = [
    ...transactions,
    {
      id: "trx-transport",
      description: "Naik ojek",
      category: "Transport",
      account: "GoPay",
      amount: 45_000,
      type: "EXPENSE" as const,
      date: "2026-08-23",
      time: "07:30",
    },
    {
      id: "trx-old-food",
      description: "Makan Juli",
      category: "Food & Drink",
      account: "Cash",
      amount: 30_000,
      type: "EXPENSE" as const,
      date: "2026-07-31",
      time: "12:00",
    },
    {
      id: "trx-food-refund",
      description: "Pengembalian makan",
      category: "Food & Drink",
      account: "Cash",
      amount: 10_000,
      type: "INCOME" as const,
      date: "2026-08-22",
      time: "13:00",
    },
  ];

  it("derives category and total spending from matching monthly expenses", () => {
    expect(
      calculateBudgetOverview(allocations, budgetTransactions, "2026-08"),
    ).toMatchObject({
      allocated: 70_000,
      spent: 63_000,
      remaining: 7_000,
      progress: 0.9,
      budgets: [
        {
          id: "budget-food",
          spent: 18_000,
          remaining: 2_000,
          progress: 0.9,
          status: "near-limit",
        },
        {
          id: "budget-transport",
          spent: 45_000,
          remaining: 5_000,
          progress: 0.9,
          status: "near-limit",
        },
      ],
    });
  });

  it("reports an overspent category and clamps only its visual progress", () => {
    const overview = calculateBudgetOverview(
      [{ ...allocations[0], amount: 10_000 }],
      budgetTransactions,
      "2026-08",
    );

    expect(overview.budgets[0]).toMatchObject({
      spent: 18_000,
      remaining: -8_000,
      progress: 1,
      status: "over",
    });
  });

  it("distinguishes an exact limit from an unused allocation", () => {
    const overview = calculateBudgetOverview(
      [
        { ...allocations[0], amount: 18_000 },
        {
          id: "budget-entertainment",
          category: "Entertainment",
          amount: 100_000,
          monthKey: "2026-08",
        },
      ],
      budgetTransactions,
      "2026-08",
    );

    expect(overview.budgets.map(({ status }) => status)).toEqual([
      "limit-reached",
      "unused",
    ]);
  });

  it("returns a stable empty overview when no budget is configured", () => {
    expect(calculateBudgetOverview([], budgetTransactions, "2026-08")).toEqual({
      allocated: 0,
      budgets: [],
      progress: 0,
      remaining: 0,
      spent: 0,
    });
  });

  it("adds a new allocation and updates an existing category without duplicates", () => {
    const newAllocation = {
      id: "budget-bills",
      category: "Bills",
      amount: 500_000,
      monthKey: "2026-08",
    };
    const withBills = upsertBudgetAllocation(allocations, newAllocation);

    expect(withBills).toHaveLength(3);
    expect(
      upsertBudgetAllocation(withBills, {
        ...newAllocation,
        id: "different-local-id",
        amount: 300_000,
      }),
    ).toEqual([
      ...allocations,
      { ...newAllocation, amount: 300_000 },
    ]);
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

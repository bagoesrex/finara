import { describe, expect, it } from "vitest";

import {
  accountRenameDtoSchema,
  applyTransactionToAccounts,
  isAccountId,
  parseUpdateAccountInput,
  removeTransactionFromAccounts,
  replaceTransactionInAccounts,
  validateAccountName,
  type FinanceAccount,
} from "./accounts";
import type { SearchableTransaction } from "./finance";

const accounts: FinanceAccount[] = [
  {
    id: "account-bca",
    name: "BCA",
    type: "BANK",
    currentBalance: 3_800_000,
  },
  {
    id: "account-gopay",
    name: "GoPay",
    type: "EWALLET",
    currentBalance: 450_000,
  },
];

const transactions: SearchableTransaction[] = [
  {
    id: "trx-coffee",
    description: "Kopi susu",
    category: "Food & Drink",
    account: "GoPay",
    amount: 18_000,
    type: "EXPENSE",
    date: "2026-08-25",
    time: "08:20",
  },
  {
    id: "trx-salary",
    description: "Gaji Agustus",
    category: "Salary",
    account: "BCA",
    amount: 5_000_000,
    type: "INCOME",
    date: "2026-08-21",
    time: "09:00",
  },
];

describe("account name validation", () => {
  it("trims a valid familiar name", () => {
    expect(validateAccountName("  Bank Harian  ", accounts, "account-bca")).toEqual({
      status: "valid",
      name: "Bank Harian",
    });
  });

  it("rejects blank and oversized names", () => {
    expect(validateAccountName("   ", accounts, "account-bca")).toEqual({
      status: "invalid",
      message: "Masukkan nama akun.",
    });
    expect(validateAccountName("a".repeat(41), accounts, "account-bca")).toEqual({
      status: "invalid",
      message: "Nama akun maksimal 40 karakter.",
    });
  });

  it("rejects a case-insensitive duplicate but allows the current account name", () => {
    expect(validateAccountName(" gopay ", accounts, "account-bca")).toEqual({
      status: "invalid",
      message: "Nama ini sudah dipakai akun lain.",
    });
    expect(validateAccountName(" bca ", accounts, "account-bca")).toEqual({
      status: "valid",
      name: "bca",
    });
  });
});

describe("account rename contract", () => {
  it("trims the only accepted update field", () => {
    expect(parseUpdateAccountInput({ name: "  Dana harian  " })).toEqual({
      success: true,
      data: { name: "Dana harian" },
    });
  });

  it("rejects blank, oversized, non-string, and extra fields", () => {
    expect(parseUpdateAccountInput({ name: "   " })).toMatchObject({
      success: false,
      fieldErrors: { name: "Masukkan nama akun." },
    });
    expect(parseUpdateAccountInput({ name: "a".repeat(41) })).toMatchObject({
      success: false,
      fieldErrors: { name: "Nama akun maksimal 40 karakter." },
    });
    expect(parseUpdateAccountInput({ name: 123 })).toMatchObject({
      success: false,
      fieldErrors: { name: "Masukkan nama akun." },
    });
    expect(
      parseUpdateAccountInput({ name: "BCA", userId: crypto.randomUUID() }),
    ).toMatchObject({ success: false });
  });

  it("accepts only UUID account path identifiers", () => {
    expect(isAccountId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isAccountId("not-an-account-id")).toBe(false);
  });

  it("validates the narrow renamed-account response", () => {
    expect(
      accountRenameDtoSchema.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Dana harian",
        updatedAt: "2026-08-31T08:00:00.000Z",
      }),
    ).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Dana harian",
      updatedAt: "2026-08-31T08:00:00.000Z",
    });
    expect(() =>
      accountRenameDtoSchema.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Dana harian",
        updatedAt: "not-a-timestamp",
        userId: crypto.randomUUID(),
      }),
    ).toThrow();
  });
});

describe("account balance updates", () => {
  it("applies and reverses an expense on the selected account", () => {
    const withExpense = applyTransactionToAccounts(accounts, transactions[0]);
    expect(withExpense[1].currentBalance).toBe(432_000);

    expect(
      removeTransactionFromAccounts(withExpense, transactions[0])[1]
        .currentBalance,
    ).toBe(450_000);
  });

  it("moves the balance effect when an edited transaction changes accounts and type", () => {
    const nextTransaction: SearchableTransaction = {
      ...transactions[0],
      account: "BCA",
      amount: 50_000,
      type: "INCOME",
    };

    const updated = replaceTransactionInAccounts(
      accounts,
      transactions[0],
      nextTransaction,
    );

    expect(updated).toMatchObject([
      { name: "BCA", currentBalance: 3_850_000 },
      { name: "GoPay", currentBalance: 468_000 },
    ]);
  });
});

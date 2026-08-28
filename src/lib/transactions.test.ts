import { describe, expect, it } from "vitest";

import {
  getMonthDateRange,
  getMonthKeyInTimeZone,
  parseCreateTransactionInput,
  parseListTransactionsInput,
  parseUpdateTransactionInput,
} from "./transactions";

const validTransaction = {
  accountId: "550e8400-e29b-41d4-a716-446655440000",
  categoryId: "c56a4180-65aa-42ec-a945-5fd21dec0538",
  type: "EXPENSE",
  amount: "25000",
  description: "  Makan ayam  ",
  transactionDate: "2026-08-28",
  transactionTime: "08:30",
};

describe("transaction mutation contracts", () => {
  it("normalizes a valid create payload without losing money precision", () => {
    const parsed = parseCreateTransactionInput({
      ...validTransaction,
      amount: "9007199254740993",
      clientRequestId: "b3d1f82b-4d97-4f36-a42a-8e8ef0d7824f",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.amount).toBe(BigInt("9007199254740993"));
    expect(parsed.data.description).toBe("Makan ayam");
    expect(parsed.data.transactionDate).toBe("2026-08-28");
    expect(parsed.data.transactionTime).toBe("08:30");
  });

  it.each([
    ["zero amount", { amount: "0" }],
    ["signed amount", { amount: "-25000" }],
    ["fractional amount", { amount: "25000.5" }],
    ["PostgreSQL bigint overflow", { amount: "9223372036854775808" }],
    ["blank description", { description: "   " }],
    ["impossible date", { transactionDate: "2026-02-30" }],
    ["invalid time", { transactionTime: "24:00" }],
    ["unknown transaction type", { type: "TRANSFER" }],
    ["malformed account id", { accountId: "owner-account" }],
  ])("rejects %s", (_label, override) => {
    const parsed = parseCreateTransactionInput({
      ...validTransaction,
      ...override,
      clientRequestId: "b3d1f82b-4d97-4f36-a42a-8e8ef0d7824f",
    });

    expect(parsed.success).toBe(false);
  });

  it("normalizes an omitted optional time to null", () => {
    const withoutTime: Record<string, unknown> = { ...validTransaction };
    delete withoutTime.transactionTime;
    const parsed = parseUpdateTransactionInput(withoutTime);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.transactionTime).toBeNull();
  });

  it("rejects fields outside the public mutation contract", () => {
    const parsed = parseCreateTransactionInput({
      ...validTransaction,
      clientRequestId: "b3d1f82b-4d97-4f36-a42a-8e8ef0d7824f",
      userId: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("transaction list contract", () => {
  it("uses bounded defaults and normalizes filters", () => {
    const parsed = parseListTransactionsInput({
      search: "  ayam  ",
      month: "2026-08",
    });

    expect(parsed).toEqual({
      success: true,
      data: {
        cursor: undefined,
        limit: 20,
        month: "2026-08",
        search: "ayam",
        type: undefined,
      },
    });
  });

  it.each([
    { limit: "0" },
    { limit: "51" },
    { limit: "ten" },
    { month: "2026-13" },
    { cursor: "not-a-uuid" },
    { search: "a".repeat(81) },
  ])("rejects an invalid list query %#", (input) => {
    expect(parseListTransactionsInput(input).success).toBe(false);
  });
});

describe("month date ranges", () => {
  it("uses an inclusive start and exclusive next-month boundary", () => {
    expect(getMonthDateRange("2026-12")).toEqual({
      start: new Date("2026-12-01T00:00:00.000Z"),
      end: new Date("2027-01-01T00:00:00.000Z"),
    });
  });

  it("derives the Jakarta month instead of the server's UTC month", () => {
    expect(
      getMonthKeyInTimeZone(
        new Date("2026-08-31T18:00:00.000Z"),
        "Asia/Jakarta",
      ),
    ).toBe("2026-09");
  });
});

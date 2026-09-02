import { describe, expect, it } from "bun:test";

import {
  aiComposerIntentSchema,
  aiComposerResponseSchema,
  parseAiComposerInput,
} from "./ai-composer";

describe("AI composer contracts", () => {
  it("accepts one bounded text field and rejects forged identity", () => {
    expect(parseAiComposerInput({ text: "  saldo saya?  " })).toEqual({
      success: true,
      data: { text: "saldo saya?" },
    });
    expect(
      parseAiComposerInput({ text: "saldo saya?", userId: "forged" }).success,
    ).toBe(false);
  });

  it("accepts only allowlisted intent variants without record identifiers", () => {
    expect(
      aiComposerIntentSchema.parse({ intent: "GET_BALANCE" }),
    ).toEqual({ intent: "GET_BALANCE" });
    expect(
      aiComposerIntentSchema.parse({
        intent: "GET_SPENDING_SUMMARY",
        transactionType: "EXPENSE",
        categoryHint: "Food & Drink",
        ranking: "NONE",
      }),
    ).toMatchObject({ intent: "GET_SPENDING_SUMMARY" });
    expect(() =>
      aiComposerIntentSchema.parse({
        intent: "GET_BALANCE",
        userId: "forged",
      }),
    ).toThrow();
    expect(() =>
      aiComposerIntentSchema.parse({
        intent: "GET_TRANSACTIONS",
        sql: "select * from Transaction",
      }),
    ).toThrow();
  });

  it("validates additive transaction, answer, and unsupported responses", () => {
    expect(
      aiComposerResponseSchema.parse({
        kind: "finance_answer",
        label: "Saldo tersedia",
        value: "Rp1.250.000",
        detail: "Dari 2 akun.",
      }),
    ).toMatchObject({ kind: "finance_answer" });
    expect(
      aiComposerResponseSchema.parse({
        kind: "unsupported",
        message: "Saat ini saya hanya bisa menjawab ringkasan bulan ini.",
      }),
    ).toMatchObject({ kind: "unsupported" });
    expect(() =>
      aiComposerResponseSchema.parse({
        kind: "finance_answer",
        label: "Saldo tersedia",
        value: "Rp1.250.000",
        detail: null,
        rawTransactions: [],
      }),
    ).toThrow();
  });
});

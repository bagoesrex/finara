import { describe, expect, it } from "vitest";

import {
  adaptAiTransactionPreview,
  aiTransactionExtractionSchema,
  aiTransactionPreviewResponseSchema,
  parseAiTransactionInput,
  resolveAiTransactionPreview,
} from "./ai-transaction";

const account = {
  id: "c56a4180-65aa-42ec-a945-5fd21dec0538",
  name: "BCA",
};

const categories = [
  {
    id: "8c3f8b9a-72e7-4aa4-8758-12ab74573d9f",
    name: "Food & Drink",
    type: "EXPENSE" as const,
  },
  {
    id: "e7bb05f4-2ccf-4e76-96dd-19d43a53a001",
    name: "Other",
    type: "EXPENSE" as const,
  },
  {
    id: "16b1fc9e-850d-458d-819f-070c0cb4fdad",
    name: "Salary",
    type: "INCOME" as const,
  },
];

const extraction = {
  intent: "CREATE_TRANSACTION" as const,
  type: "EXPENSE" as const,
  amount: "25000",
  description: "Makan ayam",
  categoryHint: "Food & Drink",
  transactionDate: "2026-08-30",
  transactionTime: null,
  missingFields: [],
};

describe("AI transaction contracts", () => {
  it("trims a bounded transaction message and rejects unknown fields", () => {
    expect(parseAiTransactionInput({ text: "  makan 25rb  " })).toEqual({
      success: true,
      data: { text: "makan 25rb" },
    });

    expect(parseAiTransactionInput({ text: "" }).success).toBe(false);
    expect(parseAiTransactionInput({ text: "a".repeat(281) }).success).toBe(
      false,
    );
    expect(
      parseAiTransactionInput({ text: "makan 25rb", userId: "forged" })
        .success,
    ).toBe(false);
  });

  it("accepts only a strict, normalized model extraction", () => {
    expect(aiTransactionExtractionSchema.parse(extraction)).toEqual(extraction);
    expect(() =>
      aiTransactionExtractionSchema.parse({
        ...extraction,
        amount: "25rb",
      }),
    ).toThrow();
    expect(() =>
      aiTransactionExtractionSchema.parse({
        ...extraction,
        unexpectedInstruction: "save immediately",
      }),
    ).toThrow();
  });

  it("maps a valid extraction only to authorized account and category IDs", () => {
    expect(
      resolveAiTransactionPreview(extraction, {
        accounts: [account],
        categories,
        referenceDate: "2026-08-30",
      }),
    ).toEqual({
      status: "ready",
      draft: {
        accountId: account.id,
        accountName: "BCA",
        amount: "25000",
        categoryId: categories[0].id,
        categoryName: "Food & Drink",
        description: "Makan ayam",
        transactionDate: "2026-08-30",
        transactionTime: null,
        type: "EXPENSE",
      },
    });
  });

  it("falls back to the user's compatible Other category", () => {
    const preview = resolveAiTransactionPreview(
      { ...extraction, categoryHint: "Unknown category" },
      {
        accounts: [account],
        categories,
        referenceDate: "2026-08-30",
      },
    );

    expect(preview).toMatchObject({
      status: "ready",
      draft: {
        categoryId: categories[1].id,
        categoryName: "Other",
        type: "EXPENSE",
      },
    });
  });

  it("returns a focused correction instead of guessing a missing amount", () => {
    expect(
      resolveAiTransactionPreview(
        {
          ...extraction,
          amount: null,
          missingFields: ["amount"],
        },
        {
          accounts: [account],
          categories,
          referenceDate: "2026-08-30",
        },
      ),
    ).toEqual({
      status: "needs_input",
      message: "Tambahkan nominal, misalnya 25rb.",
      missingFields: ["amount"],
    });
  });

  it("validates the public response before adapting it to client state", () => {
    const response = aiTransactionPreviewResponseSchema.parse(
      resolveAiTransactionPreview(extraction, {
        accounts: [account],
        categories,
        referenceDate: "2026-08-30",
      }),
    );

    expect(adaptAiTransactionPreview(response)).toEqual({
      account: "BCA",
      accountId: account.id,
      amount: 25_000,
      category: "Food & Drink",
      categoryId: categories[0].id,
      date: "2026-08-30",
      description: "Makan ayam",
      time: "",
      type: "EXPENSE",
    });
  });
});

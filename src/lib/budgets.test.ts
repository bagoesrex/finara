import { describe, expect, it } from "bun:test";

import {
  budgetOverviewDtoSchema,
  parseCreateBudgetInput,
  parseListBudgetsInput,
  parseUpdateBudgetInput,
} from "./budgets";

const categoryId = "8c3f8b9a-72e7-4aa4-8758-12ab74573d9f";

describe("Budget input contracts", () => {
  it("parses an exact positive-IDR category allocation", () => {
    expect(
      parseCreateBudgetInput({
        amount: " 800000 ",
        categoryId,
        month: "2026-08",
      }),
    ).toEqual({
      success: true,
      data: {
        amount: BigInt(800_000),
        categoryId,
        month: "2026-08",
      },
    });
  });

  it.each([
    ["zero", "0"],
    ["negative", "-1"],
    ["decimal", "1000.50"],
    ["beyond PostgreSQL BIGINT", "9223372036854775808"],
  ])("rejects %s allocation money", (_case, amount) => {
    expect(
      parseCreateBudgetInput({ amount, categoryId, month: "2026-08" }),
    ).toMatchObject({
      success: false,
      fieldErrors: { amount: expect.any(String) },
    });
  });

  it("requires a valid month and rejects unexpected authority fields", () => {
    expect(parseListBudgetsInput({ month: "2026-13" })).toMatchObject({
      success: false,
      fieldErrors: { month: expect.any(String) },
    });
    expect(parseListBudgetsInput({ month: "0000-01" })).toMatchObject({
      success: false,
      fieldErrors: { month: expect.any(String) },
    });
    expect(
      parseCreateBudgetInput({
        amount: "500000",
        categoryId,
        month: "2026-08",
        userId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toMatchObject({ success: false });
  });

  it("allows an update to change only the amount", () => {
    expect(parseUpdateBudgetInput({ amount: "900000" })).toEqual({
      success: true,
      data: { amount: BigInt(900_000) },
    });
    expect(
      parseUpdateBudgetInput({ amount: "900000", categoryId }),
    ).toMatchObject({ success: false });
  });
});

describe("Budget output contracts", () => {
  it("accepts precise server-derived overview values", () => {
    expect(
      budgetOverviewDtoSchema.parse({
        monthKey: "2026-08",
        monthLabel: "Agustus 2026",
        allocatedAmount: "800000",
        spentAmount: "420000",
        remainingAmount: "380000",
        progressBasisPoints: 5250,
        budgets: [
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            categoryId,
            categoryName: "Food & Drink",
            monthKey: "2026-08",
            amount: "800000",
            spentAmount: "420000",
            remainingAmount: "380000",
            progressBasisPoints: 5250,
            status: "ON_TRACK",
            createdAt: "2026-08-29T00:00:00.000Z",
            updatedAt: "2026-08-29T00:00:00.000Z",
          },
        ],
      }),
    ).toMatchObject({ remainingAmount: "380000" });
  });

  it("rejects invalid progress and money serialization", () => {
    const invalidOverview = {
      monthKey: "2026-08",
      monthLabel: "Agustus 2026",
      allocatedAmount: 800000,
      spentAmount: "0",
      remainingAmount: "800000",
      progressBasisPoints: 10001,
      budgets: [],
    };

    expect(() => budgetOverviewDtoSchema.parse(invalidOverview)).toThrow();
  });
});

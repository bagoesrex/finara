import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { BudgetOverviewDto } from "./budgets";
import {
  adaptBudgetOverview,
  invalidateBudgetResource,
  toCreateBudgetPayload,
  toUpdateBudgetPayload,
} from "./budget-query";
import { financeQueryKeys } from "./finance-query";

const categoryId = "8c3f8b9a-72e7-4aa4-8758-12ab74573d9f";
const budgetId = "550e8400-e29b-41d4-a716-446655440000";
const overviewDto: BudgetOverviewDto = {
  monthKey: "2026-08",
  monthLabel: "Agustus 2026",
  allocatedAmount: "100000",
  spentAmount: "85000",
  remainingAmount: "15000",
  progressBasisPoints: 8500,
  budgets: [
    {
      id: budgetId,
      categoryId,
      categoryName: "Food & Drink",
      monthKey: "2026-08",
      amount: "100000",
      spentAmount: "85000",
      remainingAmount: "15000",
      progressBasisPoints: 8500,
      status: "NEAR_LIMIT",
      createdAt: "2026-08-29T01:00:00.000Z",
      updatedAt: "2026-08-29T01:00:00.000Z",
    },
  ],
};

describe("budget query adapters", () => {
  it("maps authoritative DTO values into the existing UI model", () => {
    expect(adaptBudgetOverview(overviewDto)).toEqual({
      allocated: 100_000,
      spent: 85_000,
      remaining: 15_000,
      progress: 0.85,
      budgets: [
        {
          id: budgetId,
          categoryId,
          category: "Food & Drink",
          monthKey: "2026-08",
          amount: 100_000,
          spent: 85_000,
          remaining: 15_000,
          progress: 0.85,
          status: "near-limit",
        },
      ],
    });
  });

  it("rejects money outside the current UI safe-integer range", () => {
    expect(() =>
      adaptBudgetOverview({
        ...overviewDto,
        allocatedAmount: "9007199254740993",
      }),
    ).toThrow("outside the safe client range");
  });

  it("serializes create and update without authority fields", () => {
    const draft = {
      id: budgetId,
      amount: 125_000,
      category: "Food & Drink",
      categoryId,
      monthKey: "2026-08",
    };

    expect(toCreateBudgetPayload(draft)).toEqual({
      amount: "125000",
      categoryId,
      month: "2026-08",
    });
    expect(toUpdateBudgetPayload(draft)).toEqual({ amount: "125000" });
  });
});

describe("budget query invalidation", () => {
  it("isolates overview keys by viewer and month", () => {
    expect(financeQueryKeys.budgetOverview("user-a", "2026-08")).not.toEqual(
      financeQueryKeys.budgetOverview("user-b", "2026-08"),
    );
    expect(financeQueryKeys.budgetOverview("user-a", "2026-08")).not.toEqual(
      financeQueryKeys.budgetOverview("user-a", "2026-09"),
    );
  });

  it("invalidates the authoritative monthly overview", async () => {
    const queryClient = new QueryClient();
    const key = financeQueryKeys.budgetOverview("user-a", "2026-08");
    queryClient.setQueryData(key, overviewDto);

    await invalidateBudgetResource(queryClient, {
      monthKey: "2026-08",
      viewerId: "user-a",
    });

    expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
  });
});

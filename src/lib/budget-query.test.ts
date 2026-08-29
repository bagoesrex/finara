import {
  MutationObserver,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { BudgetOverviewDto } from "./budgets";
import {
  adaptBudgetOverview,
  budgetMutationOptions,
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
      allocated: BigInt(100_000),
      spent: BigInt(85_000),
      remaining: BigInt(15_000),
      progress: 0.85,
      budgets: [
        {
          id: budgetId,
          categoryId,
          category: "Food & Drink",
          monthKey: "2026-08",
          amount: BigInt(100_000),
          spent: BigInt(85_000),
          remaining: BigInt(15_000),
          progress: 0.85,
          status: "near-limit",
        },
      ],
    });
  });

  it("preserves money outside the JavaScript safe-integer range", () => {
    expect(
      adaptBudgetOverview({
        ...overviewDto,
        allocatedAmount: "9007199254740993",
      }).allocated,
    ).toBe(BigInt("9007199254740993"));
  });

  it("serializes create and update without authority fields", () => {
    const draft = {
      id: budgetId,
      amount: "125000",
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
    expect(
      toUpdateBudgetPayload({
        ...draft,
        amount: "9223372036854775807",
      }),
    ).toEqual({ amount: "9223372036854775807" });
    expect(() =>
      toUpdateBudgetPayload({
        ...draft,
        amount: "9223372036854775808",
      }),
    ).toThrow("PostgreSQL BIGINT range");
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

  it("waits for an active authoritative refetch", async () => {
    const queryClient = new QueryClient();
    const key = financeQueryKeys.budgetOverview("user-a", "2026-08");
    queryClient.setQueryData(key, overviewDto);

    let resolveRefetch!: (overview: BudgetOverviewDto) => void;
    const refetch = new Promise<BudgetOverviewDto>((resolve) => {
      resolveRefetch = resolve;
    });
    const observer = new QueryObserver(queryClient, {
      queryKey: key,
      queryFn: () => refetch,
      staleTime: Number.POSITIVE_INFINITY,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    let settled = false;

    const invalidation = invalidateBudgetResource(queryClient, {
      monthKey: "2026-08",
      viewerId: "user-a",
    }).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveRefetch(overviewDto);
    await invalidation;
    expect(settled).toBe(true);
    unsubscribe();
  });

  it("rejects invalidation when an active authoritative refetch fails", async () => {
    const queryClient = new QueryClient();
    const key = financeQueryKeys.budgetOverview("user-a", "2026-08");
    queryClient.setQueryData(key, overviewDto);
    const observer = new QueryObserver(queryClient, {
      queryKey: key,
      queryFn: async () => {
        throw new Error("Budget refetch failed");
      },
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
    });
    const unsubscribe = observer.subscribe(() => undefined);

    await expect(
      invalidateBudgetResource(queryClient, {
        monthKey: "2026-08",
        viewerId: "user-a",
      }),
    ).rejects.toThrow("Budget refetch failed");
    unsubscribe();
  });

  it("keeps a Budget mutation pending until invalidation refetches", async () => {
    const queryClient = new QueryClient();
    const key = financeQueryKeys.budgetOverview("user-a", "2026-08");
    queryClient.setQueryData(key, overviewDto);

    let resolveRefetch!: (overview: BudgetOverviewDto) => void;
    const refetch = new Promise<BudgetOverviewDto>((resolve) => {
      resolveRefetch = resolve;
    });
    const queryObserver = new QueryObserver(queryClient, {
      queryKey: key,
      queryFn: () => refetch,
      staleTime: Number.POSITIVE_INFINITY,
    });
    const unsubscribe = queryObserver.subscribe(() => undefined);
    const mutationObserver = new MutationObserver(
      queryClient,
      budgetMutationOptions(
        async () => overviewDto.budgets[0]!,
        () =>
          invalidateBudgetResource(queryClient, {
            monthKey: "2026-08",
            viewerId: "user-a",
          }),
      ),
    );
    let settled = false;
    const mutation = mutationObserver
      .mutate({
        amount: "125000",
        category: "Food & Drink",
        categoryId,
        monthKey: "2026-08",
      })
      .then(() => {
        settled = true;
      });

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveRefetch(overviewDto);
    await mutation;
    expect(settled).toBe(true);
    unsubscribe();
  });
});

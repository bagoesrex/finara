import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { FinanceSnapshotDto, TransactionDto } from "./transactions";
import {
  adaptFinanceSnapshot,
  adaptTransaction,
  FinanceRequestError,
  financeQueryKeys,
  invalidateFinanceResources,
  shouldRetryFinanceRequest,
  toTransactionMutationPayload,
} from "./finance-query";

const transactionDto: TransactionDto = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  accountId: "c56a4180-65aa-42ec-a945-5fd21dec0538",
  accountName: "BCA",
  categoryId: "8c3f8b9a-72e7-4aa4-8758-12ab74573d9f",
  categoryName: "Food & Drink",
  type: "EXPENSE",
  amount: "25000",
  description: "Makan siang",
  transactionDate: "2026-08-28",
  transactionTime: null,
  createdAt: "2026-08-28T12:00:00.000Z",
  updatedAt: "2026-08-28T12:00:00.000Z",
};

const snapshotDto: FinanceSnapshotDto = {
  monthKey: "2026-08",
  monthLabel: "Agustus 2026",
  availableBalance: "4250000",
  monthlyExpense: "1420000",
  monthlyIncome: "5670000",
  accounts: [
    {
      id: transactionDto.accountId,
      name: "BCA",
      type: "BANK",
      currentBalance: "4250000",
    },
  ],
  categories: [
    {
      id: transactionDto.categoryId,
      name: "Food & Drink",
      type: "EXPENSE",
    },
  ],
};

describe("finance query adapters", () => {
  it("maps precise DTOs into the existing safe client view model", () => {
    expect(adaptFinanceSnapshot(snapshotDto)).toEqual({
      accounts: [
        {
          id: transactionDto.accountId,
          name: "BCA",
          type: "BANK",
          currentBalance: 4_250_000,
        },
      ],
      categories: snapshotDto.categories,
      summary: {
        available: 4_250_000,
        incomeThisMonth: 5_670_000,
        monthKey: "2026-08",
        monthLabel: "Agustus 2026",
        spentThisMonth: 1_420_000,
      },
    });

    expect(adaptTransaction(transactionDto)).toMatchObject({
      account: "BCA",
      accountId: transactionDto.accountId,
      amount: 25_000,
      category: "Food & Drink",
      categoryId: transactionDto.categoryId,
      date: "2026-08-28",
      time: "",
    });
  });

  it("rejects money that cannot be represented safely in the current UI", () => {
    expect(() =>
      adaptTransaction({
        ...transactionDto,
        amount: "9007199254740993",
      }),
    ).toThrow("outside the safe client range");
  });

  it("serializes a validated client draft without adding authority fields", () => {
    expect(
      toTransactionMutationPayload({
        account: "BCA",
        accountId: transactionDto.accountId,
        amount: 25_000,
        category: "Food & Drink",
        categoryId: transactionDto.categoryId,
        date: "2026-08-28",
        description: " Makan siang ",
        time: "",
        type: "EXPENSE",
      }),
    ).toEqual({
      accountId: transactionDto.accountId,
      amount: "25000",
      categoryId: transactionDto.categoryId,
      description: "Makan siang",
      transactionDate: "2026-08-28",
      transactionTime: null,
      type: "EXPENSE",
    });
  });
});

describe("finance query keys and invalidation", () => {
  it("isolates every resource by authenticated viewer", () => {
    expect(financeQueryKeys.snapshot("user-a", "2026-08")).not.toEqual(
      financeQueryKeys.snapshot("user-b", "2026-08"),
    );
    expect(financeQueryKeys.transactionList("user-a", {})).toEqual([
      "finance",
      "user-a",
      "transactions",
      "list",
      { month: "", search: "", type: "" },
    ]);
  });

  it("invalidates snapshot, lists, and the affected detail", async () => {
    const queryClient = new QueryClient();
    const snapshotKey = financeQueryKeys.snapshot("user-a", "2026-08");
    const listKey = financeQueryKeys.transactionList("user-a", {});
    const detailKey = financeQueryKeys.transactionDetail(
      "user-a",
      transactionDto.id,
    );
    const budgetKey = financeQueryKeys.budgetOverview("user-a", "2026-08");
    queryClient.setQueryData(snapshotKey, snapshotDto);
    queryClient.setQueryData(listKey, { pages: [], pageParams: [] });
    queryClient.setQueryData(detailKey, transactionDto);
    queryClient.setQueryData(budgetKey, {});

    await invalidateFinanceResources(queryClient, {
      monthKey: "2026-08",
      transactionId: transactionDto.id,
      viewerId: "user-a",
    });

    expect(queryClient.getQueryState(snapshotKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(budgetKey)?.isInvalidated).toBe(true);
  });
});

describe("finance query retries", () => {
  it("does not retry client errors and limits transient retries", () => {
    expect(
      shouldRetryFinanceRequest(
        0,
        new FinanceRequestError("Not found", 404, "NOT_FOUND"),
      ),
    ).toBe(false);
    expect(shouldRetryFinanceRequest(0, new TypeError("Network error"))).toBe(true);
    expect(shouldRetryFinanceRequest(2, new TypeError("Network error"))).toBe(false);
  });
});

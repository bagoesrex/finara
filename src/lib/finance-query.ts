import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";

import type { FinanceAccount } from "./accounts";
import type {
  FinanceSummary,
  ParsedTransaction,
  SearchableTransaction,
} from "./finance";
import {
  financeSnapshotDtoSchema,
  transactionDtoSchema,
  transactionPageDtoSchema,
  type FinanceSnapshotDto,
  type TransactionDto,
  type TransactionPageDto,
  type TransactionType,
} from "./transactions";

export type FinanceCategory = {
  id: string;
  name: string;
  type: TransactionType;
};

export type FinanceTransaction = SearchableTransaction & {
  accountId: string;
  categoryId: string;
};

export type TransactionDraft = ParsedTransaction & {
  accountId: string;
  account: string;
  categoryId: string;
  clientRequestId?: string;
};

export type ClientFinanceSnapshot = {
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  summary: FinanceSummary;
};

export type TransactionListFilters = {
  month?: string;
  search?: string;
  type?: TransactionType;
};

type TransactionMutationPayload = {
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: string;
  description: string;
  transactionDate: string;
  transactionTime: string | null;
};

type InvalidationScope = {
  viewerId: string;
  monthKey: string;
  transactionId?: string;
};

const apiErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      fieldErrors: z.record(z.string(), z.string()).optional(),
    }),
  })
  .strict();

function normalizedFilters(filters: TransactionListFilters) {
  return {
    month: filters.month ?? "",
    search: filters.search?.trim() ?? "",
    type: filters.type ?? "",
  };
}

export const financeQueryKeys = {
  root: (viewerId: string) => ["finance", viewerId] as const,
  snapshot: (viewerId: string, monthKey: string) =>
    [...financeQueryKeys.root(viewerId), "snapshot", monthKey] as const,
  transactionLists: (viewerId: string) =>
    [...financeQueryKeys.root(viewerId), "transactions", "list"] as const,
  transactionList: (
    viewerId: string,
    filters: TransactionListFilters,
  ) =>
    [
      ...financeQueryKeys.transactionLists(viewerId),
      normalizedFilters(filters),
    ] as const,
  transactionDetail: (viewerId: string, transactionId: string) =>
    [
      ...financeQueryKeys.root(viewerId),
      "transactions",
      "detail",
      transactionId,
    ] as const,
};

function toSafeClientMoney(value: string, requirePositive = false) {
  const amount = Number(value);

  if (
    !Number.isSafeInteger(amount) ||
    (requirePositive && amount <= 0)
  ) {
    throw new RangeError("Money value is outside the safe client range.");
  }

  return amount;
}

export function adaptTransaction(
  transaction: TransactionDto,
): FinanceTransaction {
  return {
    id: transaction.id,
    accountId: transaction.accountId,
    account: transaction.accountName,
    categoryId: transaction.categoryId,
    category: transaction.categoryName,
    type: transaction.type,
    amount: toSafeClientMoney(transaction.amount, true),
    description: transaction.description,
    date: transaction.transactionDate,
    time: transaction.transactionTime ?? "",
  };
}

export function adaptFinanceSnapshot(
  snapshot: FinanceSnapshotDto,
): ClientFinanceSnapshot {
  return {
    accounts: snapshot.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      currentBalance: toSafeClientMoney(account.currentBalance),
    })),
    categories: snapshot.categories,
    summary: {
      available: toSafeClientMoney(snapshot.availableBalance),
      incomeThisMonth: toSafeClientMoney(snapshot.monthlyIncome),
      monthKey: snapshot.monthKey,
      monthLabel: snapshot.monthLabel,
      spentThisMonth: toSafeClientMoney(snapshot.monthlyExpense),
    },
  };
}

export function toTransactionMutationPayload(
  draft: TransactionDraft,
): TransactionMutationPayload {
  if (!Number.isSafeInteger(draft.amount) || draft.amount <= 0) {
    throw new RangeError("Transaction amount is outside the safe client range.");
  }

  return {
    accountId: draft.accountId,
    categoryId: draft.categoryId,
    type: draft.type,
    amount: String(draft.amount),
    description: draft.description.trim(),
    transactionDate: draft.date,
    transactionTime: draft.time || null,
  };
}

export class FinanceRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "FinanceRequestError";
  }
}

export function shouldRetryFinanceRequest(
  failureCount: number,
  error: unknown,
) {
  if (
    error instanceof FinanceRequestError &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return false;
  }

  return failureCount < 2;
}

async function readApiData(response: Response) {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(body);
    if (parsedError.success) {
      throw new FinanceRequestError(
        parsedError.data.error.message,
        response.status,
        parsedError.data.error.code,
        parsedError.data.error.fieldErrors,
      );
    }

    throw new FinanceRequestError(
      "Respons server tidak valid.",
      response.status,
      "INVALID_RESPONSE",
    );
  }

  if (!body || typeof body !== "object" || !("data" in body)) {
    throw new FinanceRequestError(
      "Respons server tidak valid.",
      response.status,
      "INVALID_RESPONSE",
    );
  }

  return body.data;
}

async function financeFetch(path: string, init?: RequestInit) {
  return fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

export async function fetchFinanceSnapshot(monthKey: string) {
  const response = await financeFetch(
    `/api/finance/snapshot?month=${encodeURIComponent(monthKey)}`,
  );
  return financeSnapshotDtoSchema.parse(await readApiData(response));
}

export async function fetchTransactionPage(
  filters: TransactionListFilters,
  cursor: string | null,
) {
  const parameters = new URLSearchParams({ limit: "20" });
  if (filters.month) parameters.set("month", filters.month);
  if (filters.search?.trim()) parameters.set("search", filters.search.trim());
  if (filters.type) parameters.set("type", filters.type);
  if (cursor) parameters.set("cursor", cursor);

  const response = await financeFetch(`/api/transactions?${parameters}`);
  return transactionPageDtoSchema.parse(await readApiData(response));
}

export async function fetchTransactionDetail(transactionId: string) {
  const response = await financeFetch(`/api/transactions/${transactionId}`);
  return transactionDtoSchema.parse(await readApiData(response));
}

export async function createTransactionRequest(draft: TransactionDraft) {
  const response = await financeFetch("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      ...toTransactionMutationPayload(draft),
      clientRequestId: draft.clientRequestId ?? crypto.randomUUID(),
    }),
  });
  return transactionDtoSchema.parse(await readApiData(response));
}

export async function updateTransactionRequest(
  transactionId: string,
  draft: TransactionDraft,
) {
  const response = await financeFetch(`/api/transactions/${transactionId}`, {
    method: "PATCH",
    body: JSON.stringify(toTransactionMutationPayload(draft)),
  });
  return transactionDtoSchema.parse(await readApiData(response));
}

export async function deleteTransactionRequest(transactionId: string) {
  const response = await financeFetch(`/api/transactions/${transactionId}`, {
    method: "DELETE",
  });
  if (!response.ok) await readApiData(response);
}

export async function invalidateFinanceResources(
  queryClient: QueryClient,
  scope: InvalidationScope,
) {
  const invalidations: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({
      queryKey: financeQueryKeys.snapshot(scope.viewerId, scope.monthKey),
    }),
    queryClient.invalidateQueries({
      queryKey: financeQueryKeys.transactionLists(scope.viewerId),
    }),
  ];

  if (scope.transactionId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: financeQueryKeys.transactionDetail(
          scope.viewerId,
          scope.transactionId,
        ),
      }),
    );
  }

  await Promise.all(invalidations);
}

export type HydratedTransactionData = {
  pages: TransactionPageDto[];
  pageParams: Array<string | null>;
};

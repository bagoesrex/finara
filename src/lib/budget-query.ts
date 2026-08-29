import type { QueryClient } from "@tanstack/react-query";

import {
  budgetDtoSchema,
  budgetOverviewDtoSchema,
  type BudgetDto,
  type BudgetOverviewDto,
  type BudgetStatus as BudgetDtoStatus,
} from "./budgets";
import {
  financeFetch,
  financeQueryKeys,
  readApiData,
} from "./finance-query";

export type ClientBudgetStatus =
  | "unused"
  | "on-track"
  | "near-limit"
  | "limit-reached"
  | "over";

export type ClientBudgetProgress = {
  id: string;
  categoryId: string;
  category: string;
  monthKey: string;
  amount: bigint;
  spent: bigint;
  remaining: bigint;
  progress: number;
  status: ClientBudgetStatus;
};

export type ClientBudgetOverview = {
  allocated: bigint;
  spent: bigint;
  remaining: bigint;
  progress: number;
  budgets: ClientBudgetProgress[];
};

export type BudgetMutationDraft = {
  id?: string;
  amount: string;
  category: string;
  categoryId: string;
  monthKey: string;
};

type BudgetInvalidationScope = {
  viewerId: string;
  monthKey: string;
};

const statusMap = {
  UNUSED: "unused",
  ON_TRACK: "on-track",
  NEAR_LIMIT: "near-limit",
  LIMIT_REACHED: "limit-reached",
  OVER: "over",
} satisfies Record<BudgetDtoStatus, ClientBudgetStatus>;

const POSTGRES_BIGINT_MAX = BigInt("9223372036854775807");
const positiveMoneyPattern = /^\d+$/;

function toProgress(progressBasisPoints: number) {
  return progressBasisPoints / 10_000;
}

export function adaptBudgetOverview(
  overview: BudgetOverviewDto,
): ClientBudgetOverview {
  return {
    allocated: BigInt(overview.allocatedAmount),
    spent: BigInt(overview.spentAmount),
    remaining: BigInt(overview.remainingAmount),
    progress: toProgress(overview.progressBasisPoints),
    budgets: overview.budgets.map((budget) => ({
      id: budget.id,
      categoryId: budget.categoryId,
      category: budget.categoryName,
      monthKey: budget.monthKey,
      amount: BigInt(budget.amount),
      spent: BigInt(budget.spentAmount),
      remaining: BigInt(budget.remainingAmount),
      progress: toProgress(budget.progressBasisPoints),
      status: statusMap[budget.status],
    })),
  };
}

function normalizedPositiveAmount(amount: string) {
  const normalized = amount.trim();
  if (!positiveMoneyPattern.test(normalized)) {
    throw new RangeError("Budget amount must be a positive whole Rupiah value.");
  }

  const exactAmount = BigInt(normalized);
  if (exactAmount <= BigInt(0) || exactAmount > POSTGRES_BIGINT_MAX) {
    throw new RangeError("Budget amount is outside the PostgreSQL BIGINT range.");
  }

  return normalized;
}

export function toCreateBudgetPayload(draft: BudgetMutationDraft) {
  return {
    amount: normalizedPositiveAmount(draft.amount),
    categoryId: draft.categoryId,
    month: draft.monthKey,
  };
}

export function toUpdateBudgetPayload(draft: BudgetMutationDraft) {
  return { amount: normalizedPositiveAmount(draft.amount) };
}

export async function fetchBudgetOverview(monthKey: string) {
  const parameters = new URLSearchParams({ month: monthKey });
  const response = await financeFetch(`/api/budgets?${parameters}`);
  return budgetOverviewDtoSchema.parse(await readApiData(response));
}

export async function createBudgetRequest(draft: BudgetMutationDraft) {
  const response = await financeFetch("/api/budgets", {
    method: "POST",
    body: JSON.stringify(toCreateBudgetPayload(draft)),
  });
  return budgetDtoSchema.parse(await readApiData(response));
}

export async function updateBudgetRequest(draft: BudgetMutationDraft) {
  if (!draft.id) throw new TypeError("Budget ID is required for an update.");

  const response = await financeFetch(`/api/budgets/${draft.id}`, {
    method: "PATCH",
    body: JSON.stringify(toUpdateBudgetPayload(draft)),
  });
  return budgetDtoSchema.parse(await readApiData(response));
}

export function budgetMutationOptions(
  mutationFn: (draft: BudgetMutationDraft) => Promise<BudgetDto>,
  invalidate: () => Promise<void>,
) {
  return { mutationFn, onSuccess: invalidate };
}

export async function invalidateBudgetResource(
  queryClient: QueryClient,
  scope: BudgetInvalidationScope,
) {
  await queryClient.invalidateQueries(
    {
      queryKey: financeQueryKeys.budgetOverview(scope.viewerId, scope.monthKey),
    },
    { throwOnError: true },
  );
}

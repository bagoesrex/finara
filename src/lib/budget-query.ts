import type { QueryClient } from "@tanstack/react-query";

import {
  budgetDtoSchema,
  budgetOverviewDtoSchema,
  type BudgetOverviewDto,
  type BudgetStatus as BudgetDtoStatus,
} from "./budgets";
import type {
  BudgetOverview,
  BudgetProgress,
  BudgetStatus as ClientBudgetStatus,
} from "./finance";
import {
  financeFetch,
  financeQueryKeys,
  readApiData,
} from "./finance-query";

export type ClientBudgetProgress = BudgetProgress & { categoryId: string };
export type ClientBudgetOverview = Omit<BudgetOverview, "budgets"> & {
  budgets: ClientBudgetProgress[];
};

export type BudgetMutationDraft = {
  id?: string;
  amount: number;
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

function toSafeClientMoney(value: string, allowNegative = false) {
  const amount = Number(value);
  if (
    !Number.isSafeInteger(amount) ||
    (!allowNegative && amount < 0)
  ) {
    throw new RangeError("Money value is outside the safe client range.");
  }
  return amount;
}

function toProgress(progressBasisPoints: number) {
  return progressBasisPoints / 10_000;
}

export function adaptBudgetOverview(
  overview: BudgetOverviewDto,
): ClientBudgetOverview {
  return {
    allocated: toSafeClientMoney(overview.allocatedAmount),
    spent: toSafeClientMoney(overview.spentAmount),
    remaining: toSafeClientMoney(overview.remainingAmount, true),
    progress: toProgress(overview.progressBasisPoints),
    budgets: overview.budgets.map((budget) => ({
      id: budget.id,
      categoryId: budget.categoryId,
      category: budget.categoryName,
      monthKey: budget.monthKey,
      amount: toSafeClientMoney(budget.amount),
      spent: toSafeClientMoney(budget.spentAmount),
      remaining: toSafeClientMoney(budget.remainingAmount, true),
      progress: toProgress(budget.progressBasisPoints),
      status: statusMap[budget.status],
    })),
  };
}

function assertSafePositiveAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RangeError("Budget amount is outside the safe client range.");
  }
}

export function toCreateBudgetPayload(draft: BudgetMutationDraft) {
  assertSafePositiveAmount(draft.amount);
  return {
    amount: String(draft.amount),
    categoryId: draft.categoryId,
    month: draft.monthKey,
  };
}

export function toUpdateBudgetPayload(draft: BudgetMutationDraft) {
  assertSafePositiveAmount(draft.amount);
  return { amount: String(draft.amount) };
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

export async function invalidateBudgetResource(
  queryClient: QueryClient,
  scope: BudgetInvalidationScope,
) {
  await queryClient.invalidateQueries({
    queryKey: financeQueryKeys.budgetOverview(scope.viewerId, scope.monthKey),
  });
}

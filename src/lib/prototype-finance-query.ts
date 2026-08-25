import type { QueryClient } from "@tanstack/react-query";
import type { FinanceAccount } from "./accounts";
import type { BudgetAllocation, FinanceSummary } from "./finance";
import type { Transaction } from "./mock-data";

export type PrototypeFinanceState = {
  accounts: FinanceAccount[];
  budgets: BudgetAllocation[];
  summary: FinanceSummary;
  transactions: Transaction[];
};

export function prototypeFinanceQueryKey(sessionKey: string) {
  return ["finance", "prototype", sessionKey] as const;
}

export function updatePrototypeFinanceQueryData(
  queryClient: QueryClient,
  sessionKey: string,
  updater: (current: PrototypeFinanceState) => PrototypeFinanceState,
): PrototypeFinanceState {
  const nextState = queryClient.setQueryData<PrototypeFinanceState>(
    prototypeFinanceQueryKey(sessionKey),
    (current) => {
      if (!current) {
        throw new Error("Prototype finance query is not initialized");
      }

      return updater(current);
    },
  );

  if (!nextState) {
    throw new Error("Prototype finance query update failed");
  }

  return nextState;
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  applyTransactionToSummary,
  removeTransactionFromSummary,
  replaceTransactionInSummary,
  upsertBudgetAllocation,
  type BudgetAllocation,
  type FinanceSummary,
  type ParsedTransaction,
} from "@/lib/finance";
import {
  applyTransactionToAccounts,
  removeTransactionFromAccounts,
  renameAccountReferences,
  replaceTransactionInAccounts,
  validateAccountName,
  type FinanceAccount,
} from "@/lib/accounts";
import type { Transaction } from "@/lib/mock-data";
import {
  prototypeFinanceQueryKey,
  updatePrototypeFinanceQueryData,
  type PrototypeFinanceState,
} from "@/lib/prototype-finance-query";

export type TransactionDraft = ParsedTransaction & { account: string };

type MockFinanceContextValue = PrototypeFinanceState & {
  addTransaction: (draft: TransactionDraft) => Transaction;
  deleteTransaction: (id: string) => void;
  renameAccount: (id: string, name: string) => void;
  saveBudget: (budget: Omit<BudgetAllocation, "id"> & { id?: string }) => void;
  updateTransaction: (transaction: Transaction) => void;
};

const MockFinanceContext = createContext<MockFinanceContextValue | null>(null);

function currentTime(): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
  }).format(new Date()).replace(".", ":");
}

export function MockFinanceProvider({
  children,
  initialAccounts,
  initialBudgets,
  initialSummary,
  initialTransactions,
  sessionKey,
}: {
  children: ReactNode;
  initialAccounts: FinanceAccount[];
  initialBudgets: BudgetAllocation[];
  initialSummary: FinanceSummary;
  initialTransactions: Transaction[];
  sessionKey: string;
}) {
  const queryClient = useQueryClient();
  const initialState = useMemo<PrototypeFinanceState>(
    () => ({
      accounts: initialAccounts,
      budgets: initialBudgets,
      summary: initialSummary,
      transactions: initialTransactions,
    }),
    [initialAccounts, initialBudgets, initialSummary, initialTransactions],
  );
  const { data: state } = useQuery({
    initialData: initialState,
    queryFn: () => initialState,
    queryKey: prototypeFinanceQueryKey(sessionKey),
    // The prototype has no external source to refetch. Persisted API queries
    // will use the Query Client's finite default instead.
    staleTime: "static",
  });
  const updateState = useCallback(
    (updater: (current: PrototypeFinanceState) => PrototypeFinanceState) =>
      updatePrototypeFinanceQueryData(queryClient, sessionKey, updater),
    [queryClient, sessionKey],
  );

  const addTransaction = useCallback((draft: TransactionDraft) => {
    const transaction: Transaction = {
      ...draft,
      id: `local-${crypto.randomUUID()}`,
      time: draft.time ?? currentTime(),
    };

    updateState((current) => ({
      ...current,
      accounts: applyTransactionToAccounts(current.accounts, transaction),
      summary: applyTransactionToSummary(current.summary, transaction),
      transactions: [transaction, ...current.transactions],
    }));

    return transaction;
  }, [updateState]);

  const updateTransaction = useCallback((transaction: Transaction) => {
    updateState((current) => {
      const previousTransaction = current.transactions.find(
        ({ id }) => id === transaction.id,
      );
      if (!previousTransaction) return current;

      return {
        ...current,
        accounts: replaceTransactionInAccounts(
          current.accounts,
          previousTransaction,
          transaction,
        ),
        summary: replaceTransactionInSummary(
          current.summary,
          previousTransaction,
          transaction,
        ),
        transactions: current.transactions.map((item) =>
          item.id === transaction.id ? transaction : item,
        ),
      };
    });
  }, [updateState]);

  const deleteTransaction = useCallback((id: string) => {
    updateState((current) => {
      const transaction = current.transactions.find((item) => item.id === id);
      if (!transaction) return current;

      return {
        ...current,
        accounts: removeTransactionFromAccounts(current.accounts, transaction),
        summary: removeTransactionFromSummary(current.summary, transaction),
        transactions: current.transactions.filter((item) => item.id !== id),
      };
    });
  }, [updateState]);

  const renameAccount = useCallback((id: string, name: string) => {
    updateState((current) => {
      const validation = validateAccountName(name, current.accounts, id);
      if (validation.status === "invalid") return current;

      const renamed = renameAccountReferences(
        current.accounts,
        current.transactions,
        id,
        validation.name,
      );

      return { ...current, ...renamed };
    });
  }, [updateState]);

  const saveBudget = useCallback(
    (draft: Omit<BudgetAllocation, "id"> & { id?: string }) => {
      if (!Number.isFinite(draft.amount) || draft.amount <= 0) return;

      const budget: BudgetAllocation = {
        ...draft,
        id: draft.id ?? `local-budget-${crypto.randomUUID()}`,
      };
      updateState((current) => ({
        ...current,
        budgets: upsertBudgetAllocation(current.budgets, budget),
      }));
    },
    [updateState],
  );

  const value = useMemo(
    () => ({
      ...state,
      addTransaction,
      deleteTransaction,
      renameAccount,
      saveBudget,
      updateTransaction,
    }),
    [
      addTransaction,
      deleteTransaction,
      renameAccount,
      saveBudget,
      state,
      updateTransaction,
    ],
  );

  return (
    <MockFinanceContext.Provider value={value}>
      {children}
    </MockFinanceContext.Provider>
  );
}

export function useMockFinance(): MockFinanceContextValue {
  const context = useContext(MockFinanceContext);
  if (!context) throw new Error("useMockFinance must be used inside MockFinanceProvider");
  return context;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
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

export type TransactionDraft = ParsedTransaction & { account: string };

type MockFinanceState = {
  accounts: FinanceAccount[];
  budgets: BudgetAllocation[];
  summary: FinanceSummary;
  transactions: Transaction[];
};

type MockFinanceContextValue = MockFinanceState & {
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
}: {
  children: ReactNode;
  initialAccounts: FinanceAccount[];
  initialBudgets: BudgetAllocation[];
  initialSummary: FinanceSummary;
  initialTransactions: Transaction[];
}) {
  const [state, setState] = useState<MockFinanceState>(() => ({
    accounts: initialAccounts,
    budgets: initialBudgets,
    summary: initialSummary,
    transactions: initialTransactions,
  }));

  const addTransaction = useCallback((draft: TransactionDraft) => {
    const transaction: Transaction = {
      ...draft,
      id: `local-${crypto.randomUUID()}`,
      time: draft.time ?? currentTime(),
    };

    setState((current) => ({
      ...current,
      accounts: applyTransactionToAccounts(current.accounts, transaction),
      summary: applyTransactionToSummary(current.summary, transaction),
      transactions: [transaction, ...current.transactions],
    }));

    return transaction;
  }, []);

  const updateTransaction = useCallback((transaction: Transaction) => {
    setState((current) => {
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
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState((current) => {
      const transaction = current.transactions.find((item) => item.id === id);
      if (!transaction) return current;

      return {
        ...current,
        accounts: removeTransactionFromAccounts(current.accounts, transaction),
        summary: removeTransactionFromSummary(current.summary, transaction),
        transactions: current.transactions.filter((item) => item.id !== id),
      };
    });
  }, []);

  const renameAccount = useCallback((id: string, name: string) => {
    setState((current) => {
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
  }, []);

  const saveBudget = useCallback(
    (draft: Omit<BudgetAllocation, "id"> & { id?: string }) => {
      if (!Number.isFinite(draft.amount) || draft.amount <= 0) return;

      const budget: BudgetAllocation = {
        ...draft,
        id: draft.id ?? `local-budget-${crypto.randomUUID()}`,
      };
      setState((current) => ({
        ...current,
        budgets: upsertBudgetAllocation(current.budgets, budget),
      }));
    },
    [],
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

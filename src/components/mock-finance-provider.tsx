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
  type FinanceSummary,
  type ParsedTransaction,
} from "@/lib/finance";
import type { Transaction } from "@/lib/mock-data";

export type TransactionDraft = ParsedTransaction & { account: string };

type MockFinanceState = {
  summary: FinanceSummary;
  transactions: Transaction[];
};

type MockFinanceContextValue = MockFinanceState & {
  addTransaction: (draft: TransactionDraft) => Transaction;
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
  initialSummary,
  initialTransactions,
}: {
  children: ReactNode;
  initialSummary: FinanceSummary;
  initialTransactions: Transaction[];
}) {
  const [state, setState] = useState<MockFinanceState>(() => ({
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
      summary: applyTransactionToSummary(current.summary, transaction),
      transactions: [transaction, ...current.transactions],
    }));

    return transaction;
  }, []);

  const value = useMemo(
    () => ({ ...state, addTransaction }),
    [addTransaction, state],
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

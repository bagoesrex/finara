"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useViewer } from "@/components/viewer-provider";
import { validateAccountName, type FinanceAccount } from "@/lib/accounts";
import {
  adaptBudgetOverview,
  createBudgetRequest,
  fetchBudgetOverview,
  invalidateBudgetResource,
  updateBudgetRequest,
  type BudgetMutationDraft,
} from "@/lib/budget-query";
import {
  adaptFinanceSnapshot,
  adaptTransaction,
  createTransactionRequest,
  deleteTransactionRequest,
  fetchFinanceSnapshot,
  fetchTransactionDetail,
  fetchTransactionPage,
  financeQueryKeys,
  invalidateFinanceResources,
  updateTransactionRequest,
  type FinanceCategory,
  type FinanceTransaction,
  type TransactionDraft,
  type TransactionListFilters,
} from "@/lib/finance-query";
import type { FinanceSummary } from "@/lib/finance";

type FinanceContextValue = {
  accountNameOverrides: Readonly<Record<string, string>>;
  accounts: FinanceAccount[];
  addTransaction: (draft: TransactionDraft) => Promise<FinanceTransaction>;
  categories: FinanceCategory[];
  deleteTransaction: (id: string) => Promise<void>;
  renameAccount: (id: string, name: string) => void;
  summary: FinanceSummary;
  transactions: FinanceTransaction[];
  updateTransaction: (
    id: string,
    draft: TransactionDraft,
  ) => Promise<FinanceTransaction>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);
const EMPTY_ACCOUNTS: FinanceAccount[] = [];
const EMPTY_TRANSACTIONS: FinanceTransaction[] = [];

function applyAccountNameOverrides(
  accounts: FinanceAccount[],
  overrides: Readonly<Record<string, string>>,
) {
  return accounts.map((account) => ({
    ...account,
    name: overrides[account.id] ?? account.name,
  }));
}

function applyTransactionAccountNames(
  transactions: FinanceTransaction[],
  overrides: Readonly<Record<string, string>>,
) {
  return transactions.map((transaction) => ({
    ...transaction,
    account: overrides[transaction.accountId] ?? transaction.account,
  }));
}

export function FinanceProvider({
  children,
  monthKey,
}: {
  children: ReactNode;
  monthKey: string;
}) {
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const [accountNameOverrides, setAccountNameOverrides] = useState<
    Record<string, string>
  >({});
  const snapshotQuery = useQuery({
    queryKey: financeQueryKeys.snapshot(viewer.id, monthKey),
    queryFn: () => fetchFinanceSnapshot(monthKey),
    select: adaptFinanceSnapshot,
  });
  const transactionQuery = useInfiniteQuery({
    queryKey: financeQueryKeys.transactionList(viewer.id, {}),
    queryFn: ({ pageParam }) => fetchTransactionPage({}, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.items.map(adaptTransaction)),
  });

  const invalidate = useCallback(
    (transactionId?: string) =>
      invalidateFinanceResources(queryClient, {
        viewerId: viewer.id,
        monthKey,
        transactionId,
      }),
    [monthKey, queryClient, viewer.id],
  );
  const { mutateAsync: createTransaction } = useMutation({
    mutationFn: createTransactionRequest,
    onSuccess: async (transaction) => {
      queryClient.setQueryData(
        financeQueryKeys.transactionDetail(viewer.id, transaction.id),
        transaction,
      );
      await invalidate(transaction.id);
    },
  });
  const { mutateAsync: updateExistingTransaction } = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: TransactionDraft }) =>
      updateTransactionRequest(id, draft),
    onSuccess: async (transaction) => {
      queryClient.setQueryData(
        financeQueryKeys.transactionDetail(viewer.id, transaction.id),
        transaction,
      );
      await invalidate(transaction.id);
    },
  });
  const { mutateAsync: deleteExistingTransaction } = useMutation({
    mutationFn: deleteTransactionRequest,
    onSuccess: async (_data, transactionId) => {
      await invalidate();
      queryClient.removeQueries({
        queryKey: financeQueryKeys.transactionDetail(viewer.id, transactionId),
      });
    },
  });

  const rawAccounts = snapshotQuery.data?.accounts ?? EMPTY_ACCOUNTS;
  const rawTransactions = transactionQuery.data ?? EMPTY_TRANSACTIONS;
  const accounts = useMemo(
    () => applyAccountNameOverrides(rawAccounts, accountNameOverrides),
    [accountNameOverrides, rawAccounts],
  );
  const transactions = useMemo(
    () =>
      applyTransactionAccountNames(rawTransactions, accountNameOverrides),
    [accountNameOverrides, rawTransactions],
  );

  const addTransaction = useCallback(
    async (draft: TransactionDraft) =>
      adaptTransaction(await createTransaction(draft)),
    [createTransaction],
  );
  const updateTransaction = useCallback(
    async (id: string, draft: TransactionDraft) =>
      adaptTransaction(await updateExistingTransaction({ id, draft })),
    [updateExistingTransaction],
  );
  const deleteTransaction = useCallback(
    async (id: string) => deleteExistingTransaction(id),
    [deleteExistingTransaction],
  );
  const renameAccount = useCallback(
    (id: string, name: string) => {
      const validation = validateAccountName(name, accounts, id);
      if (validation.status === "invalid") return;
      setAccountNameOverrides((current) => ({
        ...current,
        [id]: validation.name,
      }));
    },
    [accounts],
  );
  const value = useMemo<FinanceContextValue | null>(() => {
    if (!snapshotQuery.data || !transactionQuery.data) return null;

    return {
      accountNameOverrides,
      accounts,
      addTransaction,
      categories: snapshotQuery.data.categories,
      deleteTransaction,
      renameAccount,
      summary: snapshotQuery.data.summary,
      transactions,
      updateTransaction,
    };
  }, [
    accountNameOverrides,
    accounts,
    addTransaction,
    deleteTransaction,
    renameAccount,
    snapshotQuery.data,
    transactionQuery.data,
    transactions,
    updateTransaction,
  ]);

  if (!value) {
    const hasError = snapshotQuery.isError || transactionQuery.isError;

    return (
      <main
        className="empty-page"
        role={hasError ? "alert" : "status"}
        aria-live={hasError ? undefined : "polite"}
      >
        <h1>
          {hasError ? "Data keuangan belum dapat dimuat" : "Memuat data keuangan"}
        </h1>
        <p>
          {hasError ? "Periksa koneksi lalu coba lagi." : "Mohon tunggu sebentar."}
        </p>
        {hasError ? (
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              snapshotQuery.refetch();
              transactionQuery.refetch();
            }}
          >
            Coba lagi
          </button>
        ) : null}
      </main>
    );
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used inside FinanceProvider");
  return context;
}

export function useTransactionList(filters: TransactionListFilters) {
  const viewer = useViewer();
  const { accountNameOverrides } = useFinance();
  const query = useInfiniteQuery({
    queryKey: financeQueryKeys.transactionList(viewer.id, filters),
    queryFn: ({ pageParam }) => fetchTransactionPage(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.items.map(adaptTransaction)),
  });
  const transactions = useMemo(
    () =>
      applyTransactionAccountNames(
        query.data ?? EMPTY_TRANSACTIONS,
        accountNameOverrides,
      ),
    [accountNameOverrides, query.data],
  );

  return { ...query, transactions };
}

export function useTransactionDetail(transactionId: string) {
  const viewer = useViewer();
  const { accountNameOverrides } = useFinance();
  const query = useQuery({
    queryKey: financeQueryKeys.transactionDetail(viewer.id, transactionId),
    queryFn: () => fetchTransactionDetail(transactionId),
    select: adaptTransaction,
  });
  const transaction = useMemo(() => {
    if (!query.data) return undefined;
    return {
      ...query.data,
      account:
        accountNameOverrides[query.data.accountId] ?? query.data.account,
    };
  }, [accountNameOverrides, query.data]);

  return { ...query, data: transaction };
}

export function useBudgetOverview(monthKey: string) {
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: financeQueryKeys.budgetOverview(viewer.id, monthKey),
    queryFn: () => fetchBudgetOverview(monthKey),
    select: adaptBudgetOverview,
  });
  const invalidate = useCallback(
    () =>
      invalidateBudgetResource(queryClient, {
        monthKey,
        viewerId: viewer.id,
      }),
    [monthKey, queryClient, viewer.id],
  );
  const { isPending: isCreating, mutateAsync: createBudget } = useMutation({
    mutationFn: createBudgetRequest,
    onSuccess: invalidate,
  });
  const { isPending: isUpdating, mutateAsync: updateBudget } = useMutation({
    mutationFn: updateBudgetRequest,
    onSuccess: invalidate,
  });
  const saveBudget = useCallback(
    async (draft: BudgetMutationDraft) => {
      if (draft.id) {
        await updateBudget(draft);
      } else {
        await createBudget(draft);
      }
    },
    [createBudget, updateBudget],
  );

  return {
    ...query,
    isSaving: isCreating || isUpdating,
    overview: query.data,
    saveBudget,
  };
}

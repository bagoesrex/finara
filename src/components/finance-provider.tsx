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
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useViewer } from "@/components/viewer-provider";
import {
  accountRenameMutationOptions,
  invalidateAccountRenameResources,
  renameAccountRequest,
} from "@/lib/account-query";
import type { FinanceAccount } from "@/lib/accounts";
import {
  adaptBudgetOverview,
  budgetMutationOptions,
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
import {
  getMillisecondsUntilNextJakartaMonth,
  getMonthKeyInTimeZone,
} from "@/lib/transactions";

type FinanceContextValue = {
  accounts: FinanceAccount[];
  addTransaction: (draft: TransactionDraft) => Promise<FinanceTransaction>;
  categories: FinanceCategory[];
  deleteTransaction: (id: string) => Promise<void>;
  renameAccount: (id: string, name: string) => Promise<void>;
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
const MAX_BROWSER_TIMER_DELAY = 2_147_000_000;

export function FinanceProvider({
  children,
  monthKey: initialMonthKey,
}: {
  children: ReactNode;
  monthKey: string;
}) {
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  useEffect(() => {
    let monthBoundaryTimer: number;

    const syncMonthKey = () => {
      const currentMonthKey = getMonthKeyInTimeZone(new Date());
      setMonthKey((current) =>
        current === currentMonthKey ? current : currentMonthKey,
      );
    };
    const scheduleMonthBoundary = () => {
      const now = new Date();
      const delay = Math.min(
        getMillisecondsUntilNextJakartaMonth(now) + 100,
        MAX_BROWSER_TIMER_DELAY,
      );
      monthBoundaryTimer = window.setTimeout(() => {
        syncMonthKey();
        scheduleMonthBoundary();
      }, delay);
    };
    const syncVisibleMonth = () => {
      if (document.visibilityState === "visible") syncMonthKey();
    };

    scheduleMonthBoundary();
    window.addEventListener("focus", syncMonthKey);
    document.addEventListener("visibilitychange", syncVisibleMonth);

    return () => {
      window.clearTimeout(monthBoundaryTimer);
      window.removeEventListener("focus", syncMonthKey);
      document.removeEventListener("visibilitychange", syncVisibleMonth);
    };
  }, []);
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
  const invalidateAccountRename = useCallback(
    () =>
      invalidateAccountRenameResources(queryClient, {
        monthKey,
        viewerId: viewer.id,
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
    onSuccess: async () => {
      // Removing an observed detail query here recreates it immediately and
      // fetches the just-deleted record. The detail screen owns its local
      // tombstone state; inactive stale data is revalidated on any later mount.
      await invalidate();
    },
  });
  const { mutateAsync: persistAccountRename } = useMutation(
    accountRenameMutationOptions(renameAccountRequest, invalidateAccountRename),
  );

  const accounts = snapshotQuery.data?.accounts ?? EMPTY_ACCOUNTS;
  const transactions = transactionQuery.data ?? EMPTY_TRANSACTIONS;

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
    async (id: string, name: string) => {
      await persistAccountRename({ id, name });
    },
    [persistAccountRename],
  );
  const value = useMemo<FinanceContextValue | null>(() => {
    if (!snapshotQuery.data || !transactionQuery.data) return null;

    return {
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
  const query = useInfiniteQuery({
    queryKey: financeQueryKeys.transactionList(viewer.id, filters),
    queryFn: ({ pageParam }) => fetchTransactionPage(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.items.map(adaptTransaction)),
  });

  return { ...query, transactions: query.data ?? EMPTY_TRANSACTIONS };
}

export function useTransactionDetail(transactionId: string) {
  const viewer = useViewer();
  const query = useQuery({
    queryKey: financeQueryKeys.transactionDetail(viewer.id, transactionId),
    queryFn: () => fetchTransactionDetail(transactionId),
    select: adaptTransaction,
  });
  return query;
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
  const { isPending: isCreating, mutateAsync: createBudget } = useMutation(
    budgetMutationOptions(createBudgetRequest, invalidate),
  );
  const { isPending: isUpdating, mutateAsync: updateBudget } = useMutation(
    budgetMutationOptions(updateBudgetRequest, invalidate),
  );
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

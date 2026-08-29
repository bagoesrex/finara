"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleHelp, Pencil, Plus } from "lucide-react";
import {
  calculateBudgetOverview,
  expenseCategories,
  formatCompactCurrency,
  formatCurrency,
  type BudgetProgress,
} from "@/lib/finance";
import {
  BudgetAllocationSheet,
  type BudgetAllocationDraft,
} from "./budget-allocation-sheet";
import { useFinance, useTransactionList } from "./finance-provider";
import { PageHeader } from "./page-header";

function getRemainingCopy(budget: BudgetProgress): string {
  if (budget.status === "over") {
    return `Lewat ${formatCurrency(Math.abs(budget.remaining))}`;
  }
  if (budget.status === "limit-reached") return "Batas tercapai";
  if (budget.status === "unused") return "Belum terpakai";
  return `Sisa ${formatCurrency(budget.remaining)}`;
}

function getBudgetInsight(budgets: readonly BudgetProgress[]): string {
  const mostUsed = budgets.toSorted(
    (first, second) =>
      second.spent / second.amount - first.spent / first.amount,
  )[0];

  if (!mostUsed || mostUsed.spent === 0) {
    return "Belum ada pengeluaran pada kategori yang diberi anggaran bulan ini.";
  }
  if (mostUsed.status === "over") {
    return `${mostUsed.category} melewati batas ${formatCurrency(Math.abs(mostUsed.remaining))} bulan ini.`;
  }
  if (mostUsed.status === "limit-reached") {
    return `${mostUsed.category} telah mencapai alokasi bulan ini.`;
  }
  if (mostUsed.status === "near-limit") {
    return `${mostUsed.category} memiliki sisa ${formatCurrency(mostUsed.remaining)} bulan ini.`;
  }
  return `Pemakaian tertinggi ada di ${mostUsed.category}, sebesar ${formatCompactCurrency(mostUsed.spent)}.`;
}

export function BudgetDashboard() {
  const { budgets, saveBudget, summary } = useFinance();
  const transactionFilters = useMemo(
    () => ({ month: summary.monthKey }),
    [summary.monthKey],
  );
  const transactionQuery = useTransactionList(transactionFilters);
  const {
    fetchNextPage,
    hasNextPage,
    isError: hasTransactionError,
    isFetchingNextPage,
  } = transactionQuery;
  const [draft, setDraft] = useState<BudgetAllocationDraft | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const savingRef = useRef(false);
  const overview = useMemo(
    () =>
      calculateBudgetOverview(
        budgets,
        transactionQuery.transactions,
        summary.monthKey,
      ),
    [budgets, summary.monthKey, transactionQuery.transactions],
  );
  const availableCategories = useMemo(
    () => {
      const allocatedCategories = new Set(
        overview.budgets.map(({ category }) => category),
      );
      return expenseCategories.filter(
        (category) => !allocatedCategories.has(category),
      );
    },
    [overview.budgets],
  );
  const closeSheet = useCallback(() => setDraft(null), []);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  useEffect(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      !hasTransactionError
    ) {
      void fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    hasTransactionError,
    isFetchingNextPage,
  ]);

  function startCreate() {
    const category = availableCategories[0];
    if (!category) return;
    savingRef.current = false;
    setSavedMessage("");
    setDraft({ amount: 500_000, category, monthKey: summary.monthKey });
  }

  function startEdit(budget: BudgetProgress) {
    savingRef.current = false;
    setSavedMessage("");
    setDraft({
      id: budget.id,
      amount: budget.amount,
      category: budget.category,
      monthKey: budget.monthKey,
    });
  }

  function saveAllocation() {
    if (!draft || savingRef.current || draft.amount <= 0) return;
    savingRef.current = true;
    saveBudget(draft);
    setDraft(null);
    setSavedMessage(
      `${draft.category} berhasil ${draft.id ? "diperbarui" : "ditambahkan"}.`,
    );
  }

  const summaryIsOver = overview.remaining < 0;
  const summaryLabel = summaryIsOver ? "Melebihi anggaran" : "Sisa anggaran";
  const summaryValue = Math.abs(overview.remaining);
  const pageHeader = (
    <PageHeader
      eyebrow={summary.monthLabel}
      title="Anggaran"
      description="Atur batas per kategori dan lihat pemakaiannya."
    />
  );

  if (hasTransactionError) {
    return (
      <main className="page page-enter">
        {pageHeader}
        <section className="empty-state" role="alert">
          <h2>Pengeluaran belum dapat dimuat</h2>
          <p>Periksa koneksi lalu coba lagi.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => transactionQuery.refetch()}
          >
            Coba lagi
          </button>
        </section>
      </main>
    );
  }

  if (
    transactionQuery.isPending ||
    isFetchingNextPage ||
    hasNextPage
  ) {
    return (
      <main className="page page-enter">
        {pageHeader}
        <section className="empty-state" role="status" aria-live="polite">
          <h2>Memuat pengeluaran bulan ini</h2>
          <p>Mohon tunggu sebentar.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page page-enter">
      {pageHeader}
      <section className="budget-summary" aria-labelledby="budget-summary-title">
        <div>
          <p id="budget-summary-title">{summaryLabel}</p>
          <strong>{formatCurrency(summaryValue)}</strong>
        </div>
        <p>
          {formatCompactCurrency(overview.spent)} dari{" "}
          {formatCompactCurrency(overview.allocated)} terpakai
        </p>
        <div
          className={`progress-track progress-track--summary${summaryIsOver ? " progress-track--over" : ""}`}
          role="progressbar"
          aria-label="Anggaran kategori bulan ini terpakai"
          aria-valuemin={0}
          aria-valuemax={overview.allocated}
          aria-valuenow={Math.min(overview.spent, overview.allocated)}
          aria-valuetext={`${formatCurrency(overview.spent)} dari ${formatCurrency(overview.allocated)}`}
        >
          <span style={{ transform: `scaleX(${overview.progress})` }} />
        </div>
        <p className="budget-summary__scope">Dari kategori yang diberi anggaran</p>
      </section>

      <section className="section-block" aria-labelledby="category-budget-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Per kategori</p>
            <h2 id="category-budget-title">Batas pengeluaran</h2>
          </div>
          <button
            className="section-action"
            type="button"
            onClick={startCreate}
            disabled={availableCategories.length === 0}
          >
            <Plus aria-hidden="true" size={16} />Atur
          </button>
        </div>

        {overview.budgets.length ? (
          <div className="budget-list">
            {overview.budgets.map((budget) => {
              const needsAttention =
                budget.status === "near-limit" ||
                budget.status === "limit-reached" ||
                budget.status === "over";
              return (
                <article className="budget-item" key={budget.id}>
                  <div className="budget-item__heading">
                    <div>
                      <h3>{budget.category}</h3>
                      <p>
                        <strong>{formatCompactCurrency(budget.spent)}</strong>
                        {" / "}{formatCompactCurrency(budget.amount)}
                      </p>
                    </div>
                    <button
                      className="budget-edit-button"
                      type="button"
                      onClick={() => startEdit(budget)}
                      aria-label={`Ubah anggaran ${budget.category}`}
                    >
                      <Pencil aria-hidden="true" size={15} />Ubah
                    </button>
                  </div>
                  <div
                    className={`progress-track${needsAttention ? " progress-track--warning" : ""}${budget.status === "over" ? " progress-track--over" : ""}`}
                    role="progressbar"
                    aria-label={`${budget.category} terpakai`}
                    aria-valuemin={0}
                    aria-valuemax={budget.amount}
                    aria-valuenow={Math.min(budget.spent, budget.amount)}
                    aria-valuetext={`${formatCurrency(budget.spent)} dari ${formatCurrency(budget.amount)}. ${getRemainingCopy(budget)}.`}
                  >
                    <span style={{ transform: `scaleX(${budget.progress})` }} />
                  </div>
                  <p
                    className={`budget-item__remaining${needsAttention ? " budget-item__remaining--warning" : ""}`}
                  >
                    {getRemainingCopy(budget)}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="budget-empty">
            <p>Belum ada batas pengeluaran untuk bulan ini.</p>
            <button className="secondary-button" type="button" onClick={startCreate}>
              <Plus aria-hidden="true" size={17} />Atur anggaran pertama
            </button>
          </div>
        )}
      </section>

      <aside className="budget-insight" aria-labelledby="budget-insight-title">
        <p className="eyebrow">Ringkas</p>
        <h2 id="budget-insight-title">Yang perlu diketahui</h2>
        <p>{getBudgetInsight(overview.budgets)}</p>
      </aside>

      <aside className="support-note finance-note" aria-label="Batas penyimpanan anggaran">
        <CircleHelp aria-hidden="true" size={20} />
        <div>
          <h2>Penyimpanan anggaran segera menyusul</h2>
          <p>
            Anggaran saat ini hanya berlaku selama sesi ini dan akan diatur
            ulang setelah halaman dimuat ulang.
          </p>
        </div>
      </aside>

      {draft ? (
        <BudgetAllocationSheet
          availableCategories={draft.id ? [draft.category] : availableCategories}
          draft={draft}
          onChange={setDraft}
          onClose={closeSheet}
          onSave={saveAllocation}
        />
      ) : null}

      {savedMessage ? (
        <div className="toast" role="status" aria-live="polite">
          <Check aria-hidden="true" size={17} />{savedMessage}
        </div>
      ) : null}
    </main>
  );
}

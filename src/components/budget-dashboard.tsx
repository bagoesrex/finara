"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";

import type { ClientBudgetProgress } from "@/lib/budget-query";
import { FinanceRequestError } from "@/lib/finance-query";
import { formatCompactCurrency, formatCurrency } from "@/lib/finance";
import {
  BudgetAllocationSheet,
  type BudgetAllocationDraft,
} from "./budget-allocation-sheet";
import { useBudgetOverview, useFinance } from "./finance-provider";
import { PageHeader } from "./page-header";

function getRemainingCopy(budget: ClientBudgetProgress): string {
  if (budget.status === "over") {
    return `Lewat ${formatCurrency(Math.abs(budget.remaining))}`;
  }
  if (budget.status === "limit-reached") return "Batas tercapai";
  if (budget.status === "unused") return "Belum terpakai";
  return `Sisa ${formatCurrency(budget.remaining)}`;
}

function getBudgetInsight(budgets: readonly ClientBudgetProgress[]): string {
  const mostUsed = budgets.toSorted(
    (first, second) => second.progress - first.progress,
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

function mutationErrorMessage(error: unknown) {
  return error instanceof FinanceRequestError
    ? error.message
    : "Anggaran belum dapat disimpan. Coba lagi.";
}

export function BudgetDashboard() {
  const { categories, summary } = useFinance();
  const budgetQuery = useBudgetOverview(summary.monthKey);
  const [draft, setDraft] = useState<BudgetAllocationDraft | null>(null);
  const [saveError, setSaveError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const overview = budgetQuery.overview;
  const availableCategories = useMemo(() => {
    const allocatedCategoryIds = new Set(
      overview?.budgets.map(({ categoryId }) => categoryId) ?? [],
    );
    return categories
      .filter(
        (category) =>
          category.type === "EXPENSE" &&
          !allocatedCategoryIds.has(category.id),
      )
      .map((category) => ({ id: category.id, name: category.name }));
  }, [categories, overview?.budgets]);
  const closeSheet = useCallback(() => {
    if (!budgetQuery.isSaving) setDraft(null);
  }, [budgetQuery.isSaving]);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => setSavedMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  function startCreate() {
    const category = availableCategories[0];
    if (!category) return;
    setSaveError("");
    setSavedMessage("");
    setDraft({
      amount: 500_000,
      category: category.name,
      categoryId: category.id,
      monthKey: summary.monthKey,
    });
  }

  function startEdit(budget: ClientBudgetProgress) {
    setSaveError("");
    setSavedMessage("");
    setDraft({
      id: budget.id,
      amount: budget.amount,
      category: budget.category,
      categoryId: budget.categoryId,
      monthKey: budget.monthKey,
    });
  }

  async function saveAllocation() {
    if (!draft || budgetQuery.isSaving || draft.amount <= 0) return;
    setSaveError("");

    try {
      await budgetQuery.saveBudget(draft);
      setDraft(null);
      setSavedMessage(
        `${draft.category} berhasil ${draft.id ? "diperbarui" : "ditambahkan"}.`,
      );
    } catch (error) {
      setSaveError(mutationErrorMessage(error));
    }
  }

  const pageHeader = (
    <PageHeader
      eyebrow={summary.monthLabel}
      title="Anggaran"
      description="Atur batas per kategori dan lihat pemakaiannya."
    />
  );

  if (!overview && budgetQuery.isError) {
    return (
      <main className="page page-enter">
        {pageHeader}
        <section className="empty-state" role="alert">
          <h2>Anggaran belum dapat dimuat</h2>
          <p>Periksa koneksi lalu coba lagi.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void budgetQuery.refetch()}
          >
            Coba lagi
          </button>
        </section>
      </main>
    );
  }

  if (!overview) {
    return (
      <main className="page page-enter">
        {pageHeader}
        <section className="empty-state" role="status" aria-live="polite">
          <h2>Memuat anggaran bulan ini</h2>
          <p>Mohon tunggu sebentar.</p>
        </section>
      </main>
    );
  }

  const summaryIsOver = overview.remaining < 0;
  const summaryLabel = summaryIsOver ? "Melebihi anggaran" : "Sisa anggaran";
  const summaryValue = Math.abs(overview.remaining);

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
          aria-valuemax={Math.max(overview.allocated, 1)}
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
            disabled={availableCategories.length === 0 || budgetQuery.isSaving}
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
                      disabled={budgetQuery.isSaving}
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
            <button
              className="secondary-button"
              type="button"
              onClick={startCreate}
              disabled={availableCategories.length === 0 || budgetQuery.isSaving}
            >
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

      {draft ? (
        <BudgetAllocationSheet
          availableCategories={
            draft.id
              ? [{ id: draft.categoryId, name: draft.category }]
              : availableCategories
          }
          draft={draft}
          error={saveError}
          isSaving={budgetQuery.isSaving}
          onChange={(nextDraft) => {
            setSaveError("");
            setDraft(nextDraft);
          }}
          onClose={closeSheet}
          onSave={() => void saveAllocation()}
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

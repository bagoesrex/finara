import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { clampProgress, formatCompactCurrency, formatCurrency } from "@/lib/finance";
import { budgets, budgetSummary } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Anggaran" };

export default function BudgetPage() {
  const remaining = budgetSummary.amount - budgetSummary.spent;

  return (
    <main className="page page-enter">
      <PageHeader
        eyebrow={budgetSummary.monthLabel}
        title="Anggaran"
        description="Jaga batas tanpa menghakimi pengeluaranmu."
      />

      <section className="budget-summary" aria-labelledby="budget-summary-title">
        <div>
          <p id="budget-summary-title">Sisa anggaran</p>
          <strong>{formatCurrency(remaining)}</strong>
        </div>
        <p>{formatCompactCurrency(budgetSummary.spent)} dari {formatCompactCurrency(budgetSummary.amount)} terpakai</p>
        <div
          className="progress-track progress-track--summary"
          role="progressbar"
          aria-label="Anggaran bulanan terpakai"
          aria-valuemin={0}
          aria-valuemax={budgetSummary.amount}
          aria-valuenow={budgetSummary.spent}
        >
          <span style={{ transform: `scaleX(${clampProgress(budgetSummary.spent, budgetSummary.amount)})` }} />
        </div>
      </section>

      <section className="section-block" aria-labelledby="category-budget-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Per kategori</p>
            <h2 id="category-budget-title">Batas pengeluaran</h2>
          </div>
        </div>
        <div className="budget-list">
          {budgets.map((budget) => {
            const ratio = clampProgress(budget.spent, budget.amount);
            return (
              <article className="budget-item" key={budget.id}>
                <div className="budget-item__heading">
                  <h3>{budget.category}</h3>
                  <p><strong>{formatCompactCurrency(budget.spent)}</strong> / {formatCompactCurrency(budget.amount)}</p>
                </div>
                <div
                  className={`progress-track${ratio >= 0.8 ? " progress-track--warning" : ""}`}
                  role="progressbar"
                  aria-label={`${budget.category} terpakai`}
                  aria-valuemin={0}
                  aria-valuemax={budget.amount}
                  aria-valuenow={budget.spent}
                >
                  <span style={{ transform: `scaleX(${ratio})` }} />
                </div>
                <p className="budget-item__remaining">Sisa {formatCurrency(budget.amount - budget.spent)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

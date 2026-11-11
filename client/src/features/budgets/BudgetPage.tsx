import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  financeApi,
  formatCurrency,
  type BudgetWithProgress,
} from '../../api/finance';
import { Button } from '../../components/ui/Button';
import { BudgetAllocationSheet } from './BudgetAllocationSheet';

export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function shiftMonth(monthStr: string, delta: number): string {
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const d = new Date(year, month + delta, 1);
  const nextYear = d.getFullYear();
  const nextMonth = String(d.getMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
}

export function formatMonthDisplay(monthStr: string): string {
  try {
    const [yearStr, mStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const d = new Date(year, month, 1);
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return monthStr;
  }
}

export function getGaugeColor(percentage: number): string {
  if (percentage <= 75) return 'bg-emerald-500';
  if (percentage <= 90) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getPercentageTextColor(percentage: number): string {
  if (percentage <= 75) return 'text-emerald-400';
  if (percentage <= 90) return 'text-amber-400';
  return 'text-rose-400';
}

export interface BudgetPageProps {
  initialMonth?: string;
}

export function BudgetPage({ initialMonth }: BudgetPageProps) {
  const [month, setMonth] = useState<string>(initialMonth || getCurrentMonthString);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithProgress | null>(null);

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', month],
    queryFn: () => financeApi.getBudgets(month),
  });

  const handlePrevMonth = () => {
    setMonth((prev) => shiftMonth(prev, -1));
  };

  const handleNextMonth = () => {
    setMonth((prev) => shiftMonth(prev, 1));
  };

  const handleOpenNewAllocation = () => {
    setEditingBudget(null);
    setIsSheetOpen(true);
  };

  const handleEditBudget = (budget: BudgetWithProgress) => {
    setEditingBudget(budget);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingBudget(null);
  };

  // Overview calculations
  const totalAmount = budgets.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
  const totalRemaining = totalAmount - totalSpent;
  const totalPercentage = totalAmount > 0 ? Math.round((totalSpent / totalAmount) * 100) : 0;
  const isTotalOverbudget = totalRemaining < 0;

  return (
    <div className="space-y-4 pb-4">
      {/* Month Switcher & Top CTA */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-[#12141D] border border-[#232738] rounded-xl px-2 py-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Bulan sebelumnya"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-[#1A1D2B] rounded-lg transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            data-testid="current-month-display"
            className="text-xs font-semibold text-slate-100 min-w-[110px] text-center select-none"
          >
            {formatMonthDisplay(month)}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Bulan berikutnya"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-[#1A1D2B] rounded-lg transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenNewAllocation}
        >
          Alokasi Budget
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center rounded-2xl bg-[#12141D] border border-[#232738] text-slate-400 text-xs">
          Memuat budget...
        </div>
      ) : budgets.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[#12141D] border border-[#232738] flex flex-col items-center justify-center space-y-3">
          <p className="text-sm text-slate-400">Belum ada budget untuk bulan ini</p>
          <Button variant="primary" onClick={handleOpenNewAllocation}>
            Alokasi Budget
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overview Card */}
          <section className="p-4 rounded-2xl bg-[#12141D] border border-[#232738] space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Terpakai vs Total Budget</span>
              <span className="font-semibold tabular-nums text-slate-200">
                {totalPercentage}%
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="tabular-nums">
                <span className="text-xl font-bold tracking-tight text-slate-100">
                  {formatCurrency(totalSpent)}
                </span>
                <span className="text-xs text-slate-400 ml-1.5">
                  / {formatCurrency(totalAmount)}
                </span>
              </div>
              <span
                className={`text-xs font-medium tabular-nums ${
                  isTotalOverbudget ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {isTotalOverbudget
                  ? `Overbudget ${formatCurrency(Math.abs(totalRemaining))}`
                  : `Sisa ${formatCurrency(totalRemaining)}`}
              </span>
            </div>

            {/* Overall progress gauge */}
            <div className="w-full h-2 rounded-full bg-[#1A1D2B] overflow-hidden">
              <div
                role="progressbar"
                aria-label="Progress budget total"
                aria-valuenow={totalPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                className={`h-full rounded-full transition-all duration-300 ${getGaugeColor(
                  totalPercentage
                )}`}
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              />
            </div>
          </section>

          {/* Category Budget List */}
          <div className="space-y-2.5">
            {budgets.map((item) => {
              const percentage =
                item.amount > 0 ? Math.round((item.spent / item.amount) * 100) : 0;
              const isOver = item.remaining < 0 || item.spent > item.amount;
              const overAmount = Math.abs(item.remaining);

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEditBudget(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEditBudget(item);
                    }
                  }}
                  data-testid={`budget-item-${item.category_id}`}
                  className="p-4 rounded-2xl bg-[#12141D] border border-[#232738] hover:border-[#33394B] transition cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#1A1D2B] text-slate-200 border border-[#232738]">
                      {item.category_name}
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${getPercentageTextColor(
                        percentage
                      )}`}
                    >
                      {percentage}%
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <div className="tabular-nums">
                      <span className="font-semibold text-slate-100">
                        {formatCurrency(item.spent)}
                      </span>
                      <span className="text-slate-400">
                        {' '}
                        / {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <span
                      className={`font-medium tabular-nums ${
                        isOver ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {isOver
                        ? `Overbudget ${formatCurrency(overAmount)}`
                        : `Sisa ${formatCurrency(item.remaining)}`}
                    </span>
                  </div>

                  {/* Linear progress gauge */}
                  <div className="w-full h-2 rounded-full bg-[#1A1D2B] overflow-hidden">
                    <div
                      role="progressbar"
                      aria-label={`Progress budget ${item.category_name}`}
                      aria-valuenow={percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className={`h-full rounded-full transition-all duration-300 ${getGaugeColor(
                        percentage
                      )}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Allocation Sheet */}
      <BudgetAllocationSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        month={month}
        initialCategoryID={editingBudget?.category_id}
        initialAmount={editingBudget?.amount}
      />
    </div>
  );
}

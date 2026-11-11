import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';
import {
  financeApi,
  formatCurrency,
  type ParsedTransactionDraft,
} from '../../api/finance';
import { AIComposer } from './AIComposer';
import { TransactionConfirmationSheet } from './TransactionConfirmationSheet';

function formatTransactionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function HomeDashboard() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeDraft, setActiveDraft] = useState<Partial<ParsedTransactionDraft> | null>(null);
  const [isAiDraft, setIsAiDraft] = useState(false);

  const { data: snapshot } = useQuery({
    queryKey: ['finance', 'snapshot'],
    queryFn: financeApi.getSnapshot,
  });

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => financeApi.getRecentTransactions(5),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: financeApi.getAccounts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: financeApi.getCategories,
  });

  const handleOpenManual = () => {
    setActiveDraft(null);
    setIsAiDraft(false);
    setIsSheetOpen(true);
  };

  const handleDraftReady = (draft: ParsedTransactionDraft) => {
    setActiveDraft(draft);
    setIsAiDraft(true);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setActiveDraft(null);
    setIsAiDraft(false);
  };

  const totalBalance = snapshot?.total_balance ?? 0;
  const monthlyIncome = snapshot?.monthly_income ?? 0;
  const monthlyExpense = snapshot?.monthly_expense ?? 0;

  return (
    <div className="space-y-4 pb-2">
      {/* Hero Balance Card */}
      <section className="p-5 rounded-2xl bg-[#12141D] border border-[#232738] shadow-xs">
        <p className="text-xs uppercase tracking-wider font-medium text-[#94A3B8]">Total Saldo</p>
        <p
          data-testid="hero-balance"
          className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-[#F8FAFC]"
        >
          {formatCurrency(totalBalance)}
        </p>

        {/* Monthly Summary Cards */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-[#1A1D2B] border border-[#232738]/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-[#94A3B8] block">Pemasukan</span>
              <span
                data-testid="monthly-income"
                className="text-xs font-semibold tabular-nums text-emerald-400 truncate block"
              >
                {formatCurrency(monthlyIncome)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#1A1D2B] border border-[#232738]/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 text-rose-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-[#94A3B8] block">Pengeluaran</span>
              <span
                data-testid="monthly-expense"
                className="text-xs font-semibold tabular-nums text-rose-400 truncate block"
              >
                {formatCurrency(monthlyExpense)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Manual Action Row */}
      <section>
        <button
          type="button"
          onClick={handleOpenManual}
          className="w-full h-11 min-h-[44px] rounded-xl bg-[#1A1D2B] border border-[#232738] hover:bg-[#232738] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs font-semibold text-[#F8FAFC] cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>Tambah manual</span>
        </button>
      </section>

      {/* Recent Transactions Section */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-[#F8FAFC]">Transaksi Terakhir</h2>

        {recentTransactions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#12141D] border border-[#232738] text-center">
            <p className="text-xs text-[#94A3B8]">Belum ada transaksi</p>
          </div>
        ) : (
          <div
            data-testid="recent-transactions-list"
            className="rounded-2xl bg-[#12141D] border border-[#232738] divide-y divide-[#232738]/60 overflow-hidden"
          >
            {recentTransactions.map((tx) => {
              const isExpense = tx.type === 'EXPENSE';
              const displayCategory =
                tx.category_name ||
                categories.find((c) => c.id === tx.category_id)?.name ||
                'Umum';

              return (
                <div key={tx.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#F8FAFC] truncate">
                      {tx.description || displayCategory}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[#94A3B8]">
                      <span>{displayCategory}</span>
                      <span>•</span>
                      <span>{formatTransactionDate(tx.transaction_date)}</span>
                    </div>
                  </div>
                  <div
                    className={`text-sm font-semibold tabular-nums shrink-0 ${
                      isExpense ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {isExpense ? `-${formatCurrency(tx.amount)}` : `+${formatCurrency(tx.amount)}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Docked AI Composer */}
      <section className="pt-2">
        <AIComposer onDraftReady={handleDraftReady} />
      </section>

      {/* Transaction Confirmation / Manual Drawer */}
      <TransactionConfirmationSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        initialData={activeDraft}
        isAiDraft={isAiDraft}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}

export default HomeDashboard;

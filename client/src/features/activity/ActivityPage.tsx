import { useState, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import {
  financeApi,
  formatCurrency,
  type Transaction,
  type TransactionType,
} from '../../api/finance';
import { Button } from '../../components/ui/Button';
import { TransactionDetailSheet } from './TransactionDetailSheet';

const PAGE_SIZE = 20;

function formatTransactionDate(dateStr: string): string {
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

type FilterType = 'ALL' | TransactionType;

const filterOptions: { label: string; value: FilterType }[] = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Pengeluaran', value: 'EXPENSE' },
  { label: 'Pemasukan', value: 'INCOME' },
];

export function ActivityPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: financeApi.getAccounts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: financeApi.getCategories,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['transactions', 'list', debouncedSearch, filterType],
    queryFn: ({ pageParam = 0 }) =>
      financeApi.getTransactions({
        search: debouncedSearch.trim() || undefined,
        type: filterType === 'ALL' ? undefined : filterType,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
  });

  const transactions = data?.pages.flatMap((page) => page) ?? [];

  const handleSelectTransaction = (tx: Transaction) => {
    setSelectedTx(tx);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedTx(null);
  };

  return (
    <div className="space-y-4 pb-2">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" aria-hidden="true" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari transaksi..."
          className="w-full h-12 min-h-[48px] bg-[#1A1D2B] border border-[#232738] rounded-xl pl-10 pr-10 text-base text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Hapus pencarian"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2">
        {filterOptions.map((opt) => {
          const isSelected = filterType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterType(opt.value)}
              className={`min-h-[38px] px-4 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-semibold'
                  : 'bg-[#1A1D2B] border border-[#232738] text-slate-300 hover:text-slate-100 hover:bg-[#232738]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Transaction List */}
      <section className="space-y-2">
        {isLoading && transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#94A3B8]">
            Memuat transaksi...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#12141D] border border-[#232738] text-center">
            <p className="text-sm text-[#94A3B8]">Tidak ada transaksi ditemukan</p>
          </div>
        ) : (
          <div
            data-testid="transactions-list"
            className="rounded-2xl bg-[#12141D] border border-[#232738] divide-y divide-[#232738]/60 overflow-hidden"
          >
            {transactions.map((tx) => {
              const isExpense = tx.type === 'EXPENSE';
              const displayCategory =
                tx.category_name ||
                categories.find((c) => c.id === tx.category_id)?.name ||
                'Umum';

              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => handleSelectTransaction(tx)}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#1A1D2B]/50 transition-colors cursor-pointer focus:outline-none focus:bg-[#1A1D2B]"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#1A1D2B] border border-[#232738] text-slate-300 shrink-0">
                        {displayCategory}
                      </span>
                      <p className="text-sm font-medium text-[#F8FAFC] truncate">
                        {tx.description || displayCategory}
                      </p>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      {formatTransactionDate(tx.transaction_date)}
                    </p>
                  </div>
                  <div
                    className={`text-sm font-semibold tabular-nums shrink-0 ${
                      isExpense ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {isExpense ? `-${formatCurrency(tx.amount)}` : `+${formatCurrency(tx.amount)}`}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {hasNextPage && (
          <div className="pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => void fetchNextPage()}
              isLoading={isFetchingNextPage}
            >
              Muat lebih banyak
            </Button>
          </div>
        )}
      </section>

      {/* Transaction Detail Sheet */}
      <TransactionDetailSheet
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        transaction={selectedTx}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}

export default ActivityPage;
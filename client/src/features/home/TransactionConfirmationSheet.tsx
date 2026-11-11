import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { NumericInput } from '../../components/ui/NumericInput';
import { Button } from '../../components/ui/Button';
import {
  financeApi,
  type Account,
  type Category,
  type Transaction,
  type TransactionType,
  type CreateTransactionInput,
  type ParsedTransactionDraft,
  type FinancialSnapshot,
} from '../../api/finance';

export interface TransactionConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<ParsedTransactionDraft> | null;
  isAiDraft?: boolean;
  accounts?: Account[];
  categories?: Category[];
  onSuccess?: (tx: Transaction) => void;
}

export function TransactionConfirmationSheet({
  isOpen,
  onClose,
  initialData,
  isAiDraft = false,
  accounts = [],
  categories = [],
  onSuccess,
}: TransactionConfirmationSheetProps) {
  const queryClient = useQueryClient();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState<number>(0);
  const [categoryID, setCategoryID] = useState<string>('');
  const [accountID, setAccountID] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const initialType = initialData?.type ?? 'EXPENSE';
    setType(initialType);
    setAmount(initialData?.amount ?? 0);
    setDescription(initialData?.description ?? '');
    setTransactionDate(
      initialData?.transaction_date ?? new Date().toISOString().split('T')[0]
    );

    const matchingCats = categories.filter((c) => c.type === initialType);
    const cat =
      initialData?.category_id && categories.some((c) => c.id === initialData.category_id)
        ? initialData.category_id
        : matchingCats[0]?.id ?? '';
    setCategoryID(cat);

    const acc =
      initialData?.account_id && accounts.some((a) => a.id === initialData.account_id)
        ? initialData.account_id
        : accounts[0]?.id ?? '';
    setAccountID(acc);

    setError(null);
  }, [isOpen, initialData, categories, accounts]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const matchingCats = categories.filter((c) => c.type === newType);
    const currentCatValid = matchingCats.some((c) => c.id === categoryID);
    if (!currentCatValid) {
      setCategoryID(matchingCats[0]?.id ?? '');
    }
  };

  const mutation = useMutation({
    mutationFn: (data: CreateTransactionInput) => financeApi.createTransaction(data),
    onMutate: async (newTx) => {
      await queryClient.cancelQueries({ queryKey: ['finance', 'snapshot'] });
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      const prevSnapshot = queryClient.getQueryData<FinancialSnapshot>(['finance', 'snapshot']);
      const prevTransactions = queryClient.getQueryData<Transaction[]>(['transactions', 'recent']);

      if (prevSnapshot) {
        const isExpense = newTx.type === 'EXPENSE';
        queryClient.setQueryData<FinancialSnapshot>(['finance', 'snapshot'], {
          total_balance: isExpense
            ? prevSnapshot.total_balance - newTx.amount
            : prevSnapshot.total_balance + newTx.amount,
          monthly_income: !isExpense
            ? prevSnapshot.monthly_income + newTx.amount
            : prevSnapshot.monthly_income,
          monthly_expense: isExpense
            ? prevSnapshot.monthly_expense + newTx.amount
            : prevSnapshot.monthly_expense,
        });
      }

      if (prevTransactions) {
        const optimisticTx: Transaction = {
          id: `temp-${Date.now()}`,
          user_id: '',
          account_id: newTx.account_id,
          category_id: newTx.category_id,
          type: newTx.type,
          amount: newTx.amount,
          description: newTx.description,
          transaction_date: newTx.transaction_date,
          transaction_time: newTx.transaction_time,
          client_request_id: newTx.client_request_id || '',
          account_name: accounts.find((a) => a.id === newTx.account_id)?.name,
          category_name: categories.find((c) => c.id === newTx.category_id)?.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<Transaction[]>(
          ['transactions', 'recent'],
          [optimisticTx, ...prevTransactions].slice(0, 5)
        );
      }

      return { prevSnapshot, prevTransactions };
    },
    onError: (_err, _newTx, context) => {
      if (context?.prevSnapshot) {
        queryClient.setQueryData(['finance', 'snapshot'], context.prevSnapshot);
      }
      if (context?.prevTransactions) {
        queryClient.setQueryData(['transactions', 'recent'], context.prevTransactions);
      }
      setError('Gagal menyimpan transaksi, silakan coba lagi');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onSuccess: (savedTx) => {
      onSuccess?.(savedTx);
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Nominal harus lebih dari 0');
      return;
    }
    if (!categoryID) {
      setError('Pilih kategori');
      return;
    }
    if (!accountID) {
      setError('Pilih akun');
      return;
    }
    if (!description.trim()) {
      setError('Deskripsi wajib diisi');
      return;
    }

    mutation.mutate({
      account_id: accountID,
      category_id: categoryID,
      type,
      amount,
      description: description.trim(),
      transaction_date: transactionDate || new Date().toISOString().split('T')[0],
    });
  };

  const filteredCategories = categories.filter((c) => c.type === type);
  const sheetTitle = isAiDraft ? 'Konfirmasi Transaksi' : 'Tambah Transaksi';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={sheetTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#1A1D2B] border border-[#232738] rounded-xl">
          <button
            type="button"
            onClick={() => handleTypeChange('EXPENSE')}
            className={`h-10 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              type === 'EXPENSE'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('INCOME')}
            className={`h-10 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              type === 'INCOME'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pemasukan
          </button>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="tx-amount" className="block text-xs font-medium text-slate-400 mb-1.5">
            Nominal
          </label>
          <NumericInput
            id="tx-amount"
            value={amount}
            onChange={(val) => {
              setAmount(val);
              if (error) setError(null);
            }}
            placeholder="0"
          />
        </div>

        {/* Category Pills */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Kategori</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filteredCategories.map((cat) => {
              const isSelected = categoryID === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryID(cat.id);
                    if (error) setError(null);
                  }}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-semibold'
                      : 'bg-[#1A1D2B] border border-[#232738] text-slate-300 hover:text-slate-100 hover:bg-[#232738]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
            {filteredCategories.length === 0 && (
              <span className="text-xs text-slate-500 italic">Tidak ada kategori</span>
            )}
          </div>
        </div>

        {/* Account Pills */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Akun</label>
          <div className="flex flex-wrap gap-2">
            {accounts.map((acc) => {
              const isSelected = accountID === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    setAccountID(acc.id);
                    if (error) setError(null);
                  }}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-semibold'
                      : 'bg-[#1A1D2B] border border-[#232738] text-slate-300 hover:text-slate-100 hover:bg-[#232738]'
                  }`}
                >
                  {acc.name}
                </button>
              );
            })}
            {accounts.length === 0 && (
              <span className="text-xs text-slate-500 italic">Tidak ada akun</span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="tx-desc" className="block text-xs font-medium text-slate-400 mb-1.5">
            Deskripsi
          </label>
          <input
            id="tx-desc"
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Contoh: Makan siang"
            className="w-full h-12 min-h-[48px] bg-[#1A1D2B] border border-[#232738] rounded-xl px-3.5 text-base text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Action CTAs */}
        <div className="pt-2 flex flex-col gap-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={mutation.isPending}
          >
            Simpan
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Batal
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}

export default TransactionConfirmationSheet;

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
  type UpdateTransactionInput,
} from '../../api/finance';

export interface TransactionDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  accounts?: Account[];
  categories?: Category[];
  onSuccess?: () => void;
}

export function TransactionDetailSheet({
  isOpen,
  onClose,
  transaction,
  accounts = [],
  categories = [],
  onSuccess,
}: TransactionDetailSheetProps) {
  const queryClient = useQueryClient();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState<number>(0);
  const [categoryID, setCategoryID] = useState<string>('');
  const [accountID, setAccountID] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !transaction) {
      setIsConfirmingDelete(false);
      setError(null);
      return;
    }

    setType(transaction.type);
    setAmount(transaction.amount);
    setDescription(transaction.description || '');
    setCategoryID(transaction.category_id || '');
    setAccountID(transaction.account_id || '');
    setTransactionDate(
      transaction.transaction_date ? transaction.transaction_date.split('T')[0] : ''
    );
    setIsConfirmingDelete(false);
    setError(null);
  }, [isOpen, transaction]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const matchingCats = categories.filter((c) => c.type === newType);
    const currentCatValid = matchingCats.some((c) => c.id === categoryID);
    if (!currentCatValid) {
      setCategoryID(matchingCats[0]?.id ?? '');
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTransactionInput) => {
      if (!transaction) throw new Error('No transaction');
      return financeApi.updateTransaction(transaction.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'snapshot'] });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      setError('Gagal memperbarui transaksi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!transaction) throw new Error('No transaction');
      return financeApi.deleteTransaction(transaction.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'snapshot'] });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      setError('Gagal menghapus transaksi');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
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

    updateMutation.mutate({
      account_id: accountID,
      category_id: categoryID,
      type,
      amount,
      description: description.trim(),
      transaction_date: transactionDate || undefined,
    });
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  if (!isOpen || !transaction) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Detail Transaksi">
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
          <label htmlFor="tx-detail-amount" className="block text-xs font-medium text-slate-400 mb-1.5">
            Nominal
          </label>
          <NumericInput
            id="tx-detail-amount"
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
          <label htmlFor="tx-detail-desc" className="block text-xs font-medium text-slate-400 mb-1.5">
            Deskripsi
          </label>
          <input
            id="tx-detail-desc"
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Deskripsi transaksi"
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
        {!isConfirmingDelete ? (
          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={updateMutation.isPending}
              disabled={deleteMutation.isPending}
            >
              Simpan
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              fullWidth
              onClick={() => setIsConfirmingDelete(true)}
              disabled={updateMutation.isPending || deleteMutation.isPending}
            >
              Hapus
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              onClick={onClose}
              disabled={updateMutation.isPending || deleteMutation.isPending}
            >
              Batal
            </Button>
          </div>
        ) : (
          <div className="pt-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-3">
            <p className="text-xs text-rose-300 font-medium text-center">
              Hapus transaksi ini?
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => setIsConfirmingDelete(false)}
                disabled={deleteMutation.isPending}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                fullWidth
                onClick={() => deleteMutation.mutate()}
                isLoading={deleteMutation.isPending}
              >
                Hapus
              </Button>
            </div>
          </div>
        )}
      </form>
    </BottomSheet>
  );
}

export default TransactionDetailSheet;
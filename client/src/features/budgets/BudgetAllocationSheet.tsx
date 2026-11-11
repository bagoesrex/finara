import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { NumericInput } from '../../components/ui/NumericInput';
import { Button } from '../../components/ui/Button';
import { financeApi } from '../../api/finance';

export interface BudgetAllocationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  month: string;
  initialCategoryID?: string;
  initialAmount?: number;
  onSuccess?: () => void;
}

export function BudgetAllocationSheet({
  isOpen,
  onClose,
  month,
  initialCategoryID,
  initialAmount,
  onSuccess,
}: BudgetAllocationSheetProps) {
  const queryClient = useQueryClient();
  const [selectedCategoryID, setSelectedCategoryID] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: financeApi.getCategories,
  });

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  useEffect(() => {
    if (isOpen) {
      setSelectedCategoryID(initialCategoryID || '');
      setAmount(initialAmount || 0);
      setError(null);
    }
  }, [isOpen, initialCategoryID, initialAmount]);

  useEffect(() => {
    if (isOpen && !initialCategoryID && !selectedCategoryID && expenseCategories.length > 0) {
      setSelectedCategoryID(expenseCategories[0].id);
    }
  }, [isOpen, initialCategoryID, selectedCategoryID, expenseCategories]);

  const upsertMutation = useMutation({
    mutationFn: () => {
      if (!selectedCategoryID) {
        throw new Error('Pilih kategori');
      }
      if (amount <= 0) {
        throw new Error('Nominal budget harus lebih besar dari 0');
      }
      return financeApi.upsertBudget({
        category_id: selectedCategoryID,
        month,
        amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err?.message || 'Gagal menyimpan budget');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryID || amount <= 0 || upsertMutation.isPending) return;
    upsertMutation.mutate();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Alokasi Budget">
      <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
        {/* Category Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Kategori
          </label>
          {isLoadingCategories ? (
            <p className="text-xs text-slate-500">Memuat kategori...</p>
          ) : expenseCategories.length === 0 ? (
            <p className="text-xs text-slate-500">Tidak ada kategori pengeluaran.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {expenseCategories.map((cat) => {
                const isSelected = selectedCategoryID === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryID(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 ring-1 ring-emerald-500/20'
                        : 'bg-[#1A1D2B] text-slate-300 border border-[#232738] hover:border-[#33394B]'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Limit Amount Input */}
        <div>
          <label htmlFor="budget-amount-input" className="block text-xs font-medium text-slate-400 mb-2">
            Batas Budget
          </label>
          <NumericInput
            id="budget-amount-input"
            value={amount}
            onChange={setAmount}
            placeholder="0"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-400 font-medium" role="alert">
            {error}
          </p>
        )}

        {/* Action Button */}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={upsertMutation.isPending}
          disabled={!selectedCategoryID || amount <= 0}
        >
          Simpan
        </Button>
      </form>
    </BottomSheet>
  );
}

"use client";

import { useRef } from "react";
import { Check, X } from "lucide-react";

import { formatCurrency } from "@/lib/finance";
import { useModalFocusTrap } from "./use-modal-focus-trap";

export type BudgetAllocationDraft = {
  id?: string;
  amount: number;
  category: string;
  categoryId: string;
  monthKey: string;
};

type BudgetCategoryOption = { id: string; name: string };

type BudgetAllocationSheetProps = {
  availableCategories: readonly BudgetCategoryOption[];
  draft: BudgetAllocationDraft;
  error?: string;
  isSaving: boolean;
  onChange: (draft: BudgetAllocationDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

export function BudgetAllocationSheet({
  availableCategories,
  draft,
  error,
  isSaving,
  onChange,
  onClose,
  onSave,
}: BudgetAllocationSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const isEditing = Boolean(draft.id);
  const isValid =
    Number.isSafeInteger(draft.amount) &&
    draft.amount > 0 &&
    draft.categoryId.length > 0;
  const descriptionIds = error
    ? "budget-sheet-caption budget-sheet-error"
    : "budget-sheet-caption";

  useModalFocusTrap(sheetRef, closeButtonRef, onClose);

  return (
    <div className="sheet-layer" role="presentation">
      <button
        className="sheet-backdrop"
        type="button"
        tabIndex={-1}
        aria-label="Tutup pengaturan anggaran"
        disabled={isSaving}
        onClick={onClose}
      />
      <section
        ref={sheetRef}
        className="confirmation-sheet confirmation-sheet--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-sheet-title"
        aria-describedby={descriptionIds}
        aria-busy={isSaving}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">{isEditing ? "Ubah batas" : "Batas baru"}</p>
            <h2 id="budget-sheet-title">
              {isEditing ? "Edit anggaran" : "Atur anggaran"}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            disabled={isSaving}
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <p className="budget-preview-amount">{formatCurrency(draft.amount)}</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid && !isSaving) onSave();
          }}
        >
          <div className="preview-form-grid budget-form-grid">
            <label className="preview-field preview-field--wide">
              <span>Kategori</span>
              <select
                name="category"
                value={draft.categoryId}
                disabled={isEditing || isSaving}
                onChange={(event) => {
                  const category = availableCategories.find(
                    (option) => option.id === event.target.value,
                  );
                  if (category) {
                    onChange({
                      ...draft,
                      category: category.name,
                      categoryId: category.id,
                    });
                  }
                }}
              >
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="preview-field preview-field--wide">
              <span>Alokasi bulanan</span>
              <input
                name="amount"
                type="number"
                inputMode="numeric"
                min="1"
                max={Number.MAX_SAFE_INTEGER}
                step="1"
                value={draft.amount || ""}
                disabled={isSaving}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "budget-sheet-error" : undefined}
                onChange={(event) =>
                  onChange({ ...draft, amount: event.target.valueAsNumber || 0 })
                }
                autoComplete="off"
                required
              />
            </label>
          </div>

          {error ? (
            <p className="form-error" id="budget-sheet-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="sheet-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={isSaving}
            >
              Batal
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={!isValid || isSaving}
            >
              <Check aria-hidden="true" size={18} />
              {isSaving
                ? "Menyimpan..."
                : isEditing
                  ? "Simpan perubahan"
                  : "Tambah anggaran"}
            </button>
          </div>
        </form>
        <p className="sheet-caption" id="budget-sheet-caption">
          {isEditing
            ? "Kategori tetap agar riwayat perhitungannya konsisten."
            : "Pengeluaran bulan aktif akan dihitung otomatis dari transaksi."}
        </p>
      </section>
    </div>
  );
}

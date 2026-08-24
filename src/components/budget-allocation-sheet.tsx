"use client";

import { useRef } from "react";
import { Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { useModalFocusTrap } from "./use-modal-focus-trap";

export type BudgetAllocationDraft = {
  id?: string;
  amount: number;
  category: string;
  monthKey: string;
};

type BudgetAllocationSheetProps = {
  availableCategories: readonly string[];
  draft: BudgetAllocationDraft;
  onChange: (draft: BudgetAllocationDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

export function BudgetAllocationSheet({
  availableCategories,
  draft,
  onChange,
  onClose,
  onSave,
}: BudgetAllocationSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const isEditing = Boolean(draft.id);
  const isValid = draft.amount > 0 && draft.category.length > 0;

  useModalFocusTrap(sheetRef, closeButtonRef, onClose);

  return (
    <div className="sheet-layer" role="presentation">
      <button
        className="sheet-backdrop"
        type="button"
        tabIndex={-1}
        aria-label="Tutup pengaturan anggaran"
        onClick={onClose}
      />
      <section
        ref={sheetRef}
        className="confirmation-sheet confirmation-sheet--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-sheet-title"
        aria-describedby="budget-sheet-caption"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">{isEditing ? "Ubah batas" : "Batas baru"}</p>
            <h2 id="budget-sheet-title">
              {isEditing ? "Edit anggaran" : "Atur anggaran"}
            </h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Tutup">
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <p className="budget-preview-amount">{formatCurrency(draft.amount)}</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid) onSave();
          }}
        >
          <div className="preview-form-grid budget-form-grid">
            <label className="preview-field preview-field--wide">
              <span>Kategori</span>
              <select
                name="category"
                value={draft.category}
                disabled={isEditing}
                onChange={(event) =>
                  onChange({ ...draft, category: event.target.value })
                }
              >
                {availableCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
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
                step="1"
                value={draft.amount || ""}
                onChange={(event) =>
                  onChange({ ...draft, amount: event.target.valueAsNumber || 0 })
                }
                autoComplete="off"
                required
              />
            </label>
          </div>

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Batal
            </button>
            <button className="primary-button" type="submit" disabled={!isValid}>
              <Check aria-hidden="true" size={18} />
              {isEditing ? "Simpan perubahan" : "Tambah anggaran"}
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

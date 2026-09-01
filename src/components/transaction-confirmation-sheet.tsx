"use client";

import { useRef } from "react";
import { Check, X } from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { formatCurrency } from "@/lib/finance";
import type { TransactionDraft } from "@/lib/finance-query";
import type { TransactionType } from "@/lib/transactions";
import { useModalFocusTrap } from "./use-modal-focus-trap";

type SheetVariant = "create" | "edit";

const sheetCopy: Record<
  SheetVariant,
  { caption: string; eyebrow: string; saveLabel: string; title: string }
> = {
  create: {
    caption: "Data akan disimpan setelah semua detail sesuai.",
    eyebrow: "Periksa dulu",
    saveLabel: "Simpan transaksi",
    title: "Tinjau transaksi",
  },
  edit: {
    caption: "Ringkasan keuangan dihitung ulang setelah disimpan.",
    eyebrow: "Perbarui data",
    saveLabel: "Simpan perubahan",
    title: "Edit transaksi",
  },
};

type TransactionConfirmationSheetProps = {
  draft: TransactionDraft;
  error?: string;
  isSaving?: boolean;
  onChange: (draft: TransactionDraft) => void;
  onClose: () => void;
  onSave: () => void;
  variant?: SheetVariant;
};

export function TransactionConfirmationSheet({
  draft,
  error,
  isSaving = false,
  onChange,
  onClose,
  onSave,
  variant = "create",
}: TransactionConfirmationSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const { accounts, categories } = useFinance();
  const isValid =
    Number.isSafeInteger(draft.amount) &&
    draft.amount > 0 &&
    draft.description.trim().length > 0 &&
    Boolean(draft.accountId && draft.categoryId);
  const copy = sheetCopy[variant];

  useModalFocusTrap(sheetRef, closeButtonRef, onClose);

  function updateType(type: TransactionType) {
    const availableCategories = categories.filter(
      (category) => category.type === type,
    );
    const category =
      availableCategories.find((item) => item.name === draft.category) ??
      availableCategories.find((item) => item.name === "Other") ??
      availableCategories[0];
    if (!category) return;

    onChange({
      ...draft,
      type,
      categoryId: category.id,
      category: category.name,
    });
  }

  const availableCategories = categories.filter(
    (category) => category.type === draft.type,
  );

  return (
    <div className="sheet-layer" role="presentation">
      <button
        className="sheet-backdrop"
        type="button"
        disabled={isSaving}
        tabIndex={-1}
        aria-label="Tutup tinjauan transaksi"
        onClick={onClose}
      />
      <section
        ref={sheetRef}
        className="confirmation-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-caption"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="confirmation-title">{copy.title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            disabled={isSaving}
            onClick={onClose}
            aria-label="Tutup"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <p className={`preview-amount preview-amount--${draft.type.toLowerCase()}`}>
          {draft.type === "EXPENSE" ? "−" : "+"}{formatCurrency(draft.amount)}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid && !isSaving) onSave();
          }}
          aria-busy={isSaving}
        >
          <fieldset className="type-selector" disabled={isSaving}>
            <legend>Jenis transaksi</legend>
            <div>
              <button
                className={draft.type === "EXPENSE" ? "is-active" : ""}
                type="button"
                aria-pressed={draft.type === "EXPENSE"}
                onClick={() => updateType("EXPENSE")}
              >
                Pengeluaran
              </button>
              <button
                className={draft.type === "INCOME" ? "is-active" : ""}
                type="button"
                aria-pressed={draft.type === "INCOME"}
                onClick={() => updateType("INCOME")}
              >
                Pemasukan
              </button>
            </div>
          </fieldset>

          <div className="preview-form-grid">
            <label className="preview-field preview-field--wide">
              <span>Deskripsi</span>
              <input
                name="description"
                value={draft.description}
                onChange={(event) => onChange({ ...draft, description: event.target.value })}
                autoComplete="off"
                disabled={isSaving}
                required
              />
            </label>
            <label className="preview-field">
              <span>Nominal</span>
              <input
                name="amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={draft.amount || ""}
                onChange={(event) => onChange({ ...draft, amount: event.target.valueAsNumber || 0 })}
                autoComplete="off"
                disabled={isSaving}
                required
              />
            </label>
            <label className="preview-field">
              <span>Tanggal</span>
              <input
                name="date"
                type="date"
                value={draft.date}
                onChange={(event) => onChange({ ...draft, date: event.target.value })}
                autoComplete="off"
                disabled={isSaving}
                required
              />
            </label>
            <label className="preview-field">
              <span>Kategori</span>
              <select
                name="category"
                disabled={isSaving}
                value={draft.categoryId}
                onChange={(event) => {
                  const category = availableCategories.find(
                    (item) => item.id === event.target.value,
                  );
                  if (category) {
                    onChange({
                      ...draft,
                      categoryId: category.id,
                      category: category.name,
                    });
                  }
                }}
              >
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="preview-field">
              <span>Akun</span>
              <select
                name="account"
                disabled={isSaving}
                value={draft.accountId}
                onChange={(event) => {
                  const account = accounts.find(
                    (item) => item.id === event.target.value,
                  );
                  if (account) {
                    onChange({
                      ...draft,
                      accountId: account.id,
                      account: account.name,
                    });
                  }
                }}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </label>
            <label className="preview-field preview-field--wide">
              <span>Waktu (opsional)</span>
              <input
                name="time"
                type="time"
                value={draft.time ?? ""}
                onChange={(event) => onChange({ ...draft, time: event.target.value })}
                autoComplete="off"
                disabled={isSaving}
              />
            </label>
          </div>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <div className="sheet-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={isSaving}
              onClick={onClose}
            >
              Batal
            </button>
            <button className="primary-button" type="submit" disabled={!isValid || isSaving}>
              <Check aria-hidden="true" size={18} />
              {isSaving ? "Menyimpanâ€¦" : error ? "Coba lagi" : copy.saveLabel}
            </button>
          </div>
        </form>
        <p className="sheet-caption" id="confirmation-caption">
          {copy.caption}
        </p>
      </section>
    </div>
  );
}

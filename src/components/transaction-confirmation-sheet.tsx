"use client";

import { useRef } from "react";
import { Check, X } from "lucide-react";
import {
  categoriesForType,
  changeDraftType,
  formatCurrency,
  type TransactionType,
} from "@/lib/finance";
import {
  useMockFinance,
  type TransactionDraft,
} from "./mock-finance-provider";
import { useModalFocusTrap } from "./use-modal-focus-trap";

type SheetVariant = "create" | "edit";

const sheetCopy: Record<
  SheetVariant,
  { caption: string; eyebrow: string; saveLabel: string; title: string }
> = {
  create: {
    caption: "Data sementara akan hilang saat halaman dimuat ulang.",
    eyebrow: "Periksa dulu",
    saveLabel: "Simpan transaksi",
    title: "Tinjau transaksi",
  },
  edit: {
    caption: "Perubahan hanya berlaku selama sesi prototipe ini.",
    eyebrow: "Perbarui data",
    saveLabel: "Simpan perubahan",
    title: "Edit transaksi",
  },
};

type TransactionConfirmationSheetProps = {
  draft: TransactionDraft;
  onChange: (draft: TransactionDraft) => void;
  onClose: () => void;
  onSave: () => void;
  variant?: SheetVariant;
};

export function TransactionConfirmationSheet({
  draft,
  onChange,
  onClose,
  onSave,
  variant = "create",
}: TransactionConfirmationSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const { accounts } = useMockFinance();
  const isValid = draft.amount > 0 && draft.description.trim().length > 0;
  const copy = sheetCopy[variant];

  useModalFocusTrap(sheetRef, closeButtonRef, onClose);

  function updateType(type: TransactionType) {
    onChange({ ...changeDraftType(draft, type), account: draft.account });
  }

  return (
    <div className="sheet-layer" role="presentation">
      <button
        className="sheet-backdrop"
        type="button"
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
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Tutup">
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <p className={`preview-amount preview-amount--${draft.type.toLowerCase()}`}>
          {draft.type === "EXPENSE" ? "−" : "+"}{formatCurrency(draft.amount)}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid) onSave();
          }}
        >
          <fieldset className="type-selector">
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
                required
              />
            </label>
            <label className="preview-field">
              <span>Kategori</span>
              <select
                name="category"
                value={draft.category}
                onChange={(event) => onChange({ ...draft, category: event.target.value })}
              >
                {categoriesForType(draft.type).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="preview-field">
              <span>Akun</span>
              <select
                name="account"
                value={draft.account}
                onChange={(event) => onChange({ ...draft, account: event.target.value })}
              >
                {accounts.map((account) => (
                  <option key={account} value={account}>{account}</option>
                ))}
              </select>
            </label>
            {draft.time ? (
              <label className="preview-field preview-field--wide">
                <span>Waktu</span>
                <input
                  name="time"
                  type="time"
                  value={draft.time}
                  onChange={(event) => onChange({ ...draft, time: event.target.value })}
                  autoComplete="off"
                />
              </label>
            ) : null}
          </div>

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onClose}>Batal</button>
            <button className="primary-button" type="submit" disabled={!isValid}>
              <Check aria-hidden="true" size={18} />
              {copy.saveLabel}
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

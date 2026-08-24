"use client";

import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import {
  categoriesForType,
  changeDraftType,
  formatCurrency,
  type TransactionType,
} from "@/lib/finance";
import { accounts } from "@/lib/mock-data";
import type { TransactionDraft } from "./mock-finance-provider";

type TransactionConfirmationSheetProps = {
  draft: TransactionDraft;
  onChange: (draft: TransactionDraft) => void;
  onClose: () => void;
  onSave: () => void;
};

export function TransactionConfirmationSheet({
  draft,
  onChange,
  onClose,
  onSave,
}: TransactionConfirmationSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const isValid = draft.amount > 0 && draft.description.trim().length > 0;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const scrollContainer = document.querySelector<HTMLElement>(".app-content");
    const previousOverflow = scrollContainer?.style.overflowY;

    if (scrollContainer) scrollContainer.style.overflowY = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])',
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (scrollContainer) scrollContainer.style.overflowY = previousOverflow ?? "";
      window.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  function updateType(type: TransactionType) {
    onChange({ ...changeDraftType(draft, type), account: draft.account });
  }

  return (
    <div className="sheet-layer" role="presentation">
      <button
        className="sheet-backdrop"
        type="button"
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
            <p className="eyebrow">Periksa dulu</p>
            <h2 id="confirmation-title">Tinjau transaksi</h2>
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
              Simpan transaksi
            </button>
          </div>
        </form>
        <p className="sheet-caption" id="confirmation-caption">
          Data sementara akan hilang saat halaman dimuat ulang.
        </p>
      </section>
    </div>
  );
}

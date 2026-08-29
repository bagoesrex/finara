"use client";

import { useRef } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import type { FinanceTransaction } from "@/lib/finance-query";
import { useModalFocusTrap } from "./use-modal-focus-trap";

type DeleteTransactionDialogProps = {
  onClose: () => void;
  onConfirm: () => void;
  error?: string;
  isDeleting?: boolean;
  transaction: FinanceTransaction;
};

export function DeleteTransactionDialog({
  onClose,
  onConfirm,
  error,
  isDeleting = false,
  transaction,
}: DeleteTransactionDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useModalFocusTrap(dialogRef, cancelButtonRef, onClose);

  return (
    <div className="sheet-layer" role="presentation">
      <button
        className="sheet-backdrop"
        type="button"
        disabled={isDeleting}
        tabIndex={-1}
        aria-label="Batalkan penghapusan transaksi"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        className="confirmation-sheet confirmation-sheet--compact"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">Konfirmasi</p>
            <h2 id="delete-title">Hapus transaksi?</h2>
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            aria-label="Tutup"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <div className="delete-summary">
          <span className="delete-summary__icon" aria-hidden="true">
            <AlertTriangle size={20} />
          </span>
          <div>
            <strong>{transaction.description}</strong>
            <span>
              {transaction.type === "EXPENSE" ? "−" : "+"}
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>
        <p className="delete-warning" id="delete-description">
          Transaksi akan dihapus dari aktivitas dan seluruh ringkasan keuangan
          akan dihitung ulang.
        </p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}

        <div className="sheet-actions">
          <button
            ref={cancelButtonRef}
            className="secondary-button"
            type="button"
            disabled={isDeleting}
            onClick={onClose}
          >
            Batal
          </button>
          <button
            className="danger-button"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            <Trash2 aria-hidden="true" size={17} />
            {isDeleting ? "Menghapusâ€¦" : "Hapus transaksi"}
          </button>
        </div>
      </section>
    </div>
  );
}

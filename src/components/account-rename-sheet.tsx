"use client";

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import {
  validateAccountName,
  type FinanceAccount,
} from "@/lib/accounts";
import { useModalFocusTrap } from "./use-modal-focus-trap";

type AccountRenameSheetProps = {
  account: FinanceAccount;
  accounts: readonly FinanceAccount[];
  onClose: () => void;
  onSave: (id: string, name: string) => void;
};

export function AccountRenameSheet({
  account,
  accounts,
  onClose,
  onSave,
}: AccountRenameSheetProps) {
  const [name, setName] = useState(account.name);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const normalizedName = name.trim();
  const isUnchanged = normalizedName === account.name;

  useModalFocusTrap(sheetRef, inputRef, onClose);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateAccountName(name, accounts, account.id);

    if (validation.status === "invalid") {
      setError(validation.message);
      inputRef.current?.focus();
      return;
    }

    onSave(account.id, validation.name);
  }

  return (
    <div className="sheet-layer" role="presentation">
      <button
        className="sheet-backdrop"
        type="button"
        tabIndex={-1}
        aria-label="Tutup ubah nama akun"
        onClick={onClose}
      />
      <section
        ref={sheetRef}
        className="confirmation-sheet confirmation-sheet--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-rename-title"
        aria-describedby="account-rename-caption"
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">Akun</p>
            <h2 id="account-rename-title">Ubah nama akun</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup">
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <form className="account-rename-form" onSubmit={handleSubmit}>
          <label className="preview-field">
            <span>Nama akun</span>
            <input
              ref={inputRef}
              name="account-name"
              value={name}
              maxLength={40}
              autoComplete="off"
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "account-name-error" : undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError("");
              }}
            />
          </label>
          {error ? (
            <p className="form-error" id="account-name-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="sheet-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Batal
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={!normalizedName || isUnchanged}
            >
              <Check aria-hidden="true" size={18} />
              Simpan
            </button>
          </div>
        </form>
        <p className="sheet-caption" id="account-rename-caption">
          Riwayat dan pilihan akun akan memakai nama baru selama sesi ini.
        </p>
      </section>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Check, X } from "lucide-react";
import {
  MAX_ACCOUNT_NAME_LENGTH,
  validateAccountName,
  type FinanceAccount,
} from "@/lib/accounts";
import { FinanceRequestError } from "@/lib/finance-query";
import { useModalFocusTrap } from "./use-modal-focus-trap";

type AccountRenameSheetProps = {
  account: FinanceAccount;
  accounts: readonly FinanceAccount[];
  onClose: () => void;
  onSave: (id: string, name: string) => Promise<void>;
};

function getSaveError(error: unknown) {
  if (error instanceof FinanceRequestError) {
    return error.fieldErrors?.name ?? error.message;
  }

  return "Nama akun belum dapat dipastikan tersimpan. Coba lagi.";
}

export function AccountRenameSheet({
  account,
  accounts,
  onClose,
  onSave,
}: AccountRenameSheetProps) {
  const [name, setName] = useState(account.name);
  const [error, setError] = useState("");
  const [isSaving, startSaving] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const sheetRef = useRef<HTMLElement>(null);
  const normalizedName = name.trim();
  const isUnchanged = normalizedName === account.name;
  const closeSheet = useCallback(() => {
    if (!savingRef.current) onClose();
  }, [onClose]);

  useModalFocusTrap(sheetRef, inputRef, closeSheet);
  useEffect(() => {
    if (error && !isSaving) inputRef.current?.focus();
  }, [error, isSaving]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const validation = validateAccountName(name, accounts, account.id);

    if (validation.status === "invalid") {
      setError(validation.message);
      return;
    }

    savingRef.current = true;
    setError("");
    startSaving(async () => {
      try {
        await onSave(account.id, validation.name);
      } catch (saveError) {
        setError(getSaveError(saveError));
      } finally {
        savingRef.current = false;
      }
    });
  }

  return (
    <div className="sheet-layer" role="presentation">
      <button
        className="sheet-backdrop"
        type="button"
        disabled={isSaving}
        tabIndex={-1}
        aria-label="Tutup ubah nama akun"
        onClick={closeSheet}
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
          <button
            type="button"
            disabled={isSaving}
            onClick={closeSheet}
            aria-label="Tutup"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <form
          className="account-rename-form"
          onSubmit={handleSubmit}
          aria-busy={isSaving}
        >
          <label className="preview-field">
            <span>Nama akun</span>
            <input
              ref={inputRef}
              name="account-name"
              value={name}
              maxLength={MAX_ACCOUNT_NAME_LENGTH}
              autoComplete="off"
              disabled={isSaving}
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
            <button
              className="secondary-button"
              type="button"
              disabled={isSaving}
              onClick={closeSheet}
            >
              Batal
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={!normalizedName || isUnchanged || isSaving}
            >
              <Check aria-hidden="true" size={18} />
              {isSaving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
        <p className="sheet-caption" id="account-rename-caption">
          Riwayat dan pilihan akun akan memakai nama baru setelah tersimpan.
        </p>
      </section>
    </div>
  );
}

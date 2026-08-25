"use client";

import { useRef, useState, type FormEvent } from "react";
import { Banknote, Building2, Check, Smartphone } from "lucide-react";
import { usePrototypeAuth } from "@/components/prototype-auth-provider";
import {
  ACCOUNT_TYPES,
  validateAccountSetup,
  type AccountSetupErrors,
  type AccountType,
} from "@/lib/auth";
import { formatCurrency } from "@/lib/finance";
import { AuthField } from "./auth-field";
import { focusFirstError } from "./focus-first-error";

const accountChoices = [
  { type: ACCOUNT_TYPES[0], label: "Cash", icon: Banknote },
  { type: ACCOUNT_TYPES[1], label: "Bank", icon: Building2 },
  { type: ACCOUNT_TYPES[2], label: "E-Wallet", icon: Smartphone },
] as const;

export function OnboardingForm() {
  const { completeOnboarding, signOut, user } = usePrototypeAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("BANK");
  const [balanceInput, setBalanceInput] = useState("0");
  const [errors, setErrors] = useState<AccountSetupErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const currentBalance =
    balanceInput.trim() === "" ? Number.NaN : Number(balanceInput);
  const formattedBalance =
    Number.isSafeInteger(currentBalance) && currentBalance >= 0
      ? formatCurrency(currentBalance)
      : "—";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors = validateAccountSetup({
      name,
      type,
      currentBalance,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(event.currentTarget, Object.keys(nextErrors));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    completeOnboarding({
      name: name.trim(),
      type,
      currentBalance,
    });
  }

  return (
    <form className="auth-form onboarding-form" onSubmit={handleSubmit} noValidate>
      <AuthField
        id="account-name"
        label="Nama akun"
        name="accountName"
        placeholder="Contoh: BCA, GoPay, atau Cash…"
        autoComplete="off"
        value={name}
        error={errors.name}
        onChange={(event) => {
          setName(event.target.value);
          if (errors.name) {
            setErrors((current) => ({ ...current, name: undefined }));
          }
        }}
        required
      />

      <fieldset className="account-type-field">
        <legend>Jenis akun</legend>
        <div className="account-type-options">
          {accountChoices.map(({ type: value, label, icon: Icon }) => (
            <label key={value}>
              <input
                type="radio"
                name="accountType"
                value={value}
                checked={type === value}
                onChange={() => {
                  setType(value);
                  if (errors.type) {
                    setErrors((current) => ({ ...current, type: undefined }));
                  }
                }}
              />
              <Icon aria-hidden="true" size={20} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {errors.type ? <small role="alert">{errors.type}</small> : null}
      </fieldset>

      <label className="auth-field balance-input-field" htmlFor="current-balance">
        <span>Saldo saat ini</span>
        <div>
          <span aria-hidden="true">Rp</span>
          <input
            id="current-balance"
            name="currentBalance"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min="0"
            step="1"
            value={balanceInput}
            aria-describedby="balance-help"
            aria-invalid={Boolean(errors.currentBalance)}
            onChange={(event) => {
              setBalanceInput(event.target.value);
              if (errors.currentBalance) {
                setErrors((current) => ({
                  ...current,
                  currentBalance: undefined,
                }));
              }
            }}
            required
          />
        </div>
        {errors.currentBalance ? (
          <small role="alert">{errors.currentBalance}</small>
        ) : (
          <small id="balance-help">
            Ini titik awal saldo, bukan transaksi pemasukan.
          </small>
        )}
      </label>

      <section className="opening-balance-summary" aria-label="Ringkasan saldo pembuka">
        <div>
          <span>Akan tampil di Home</span>
          <strong>{formattedBalance}</strong>
        </div>
        <Check aria-hidden="true" size={20} />
      </section>

      <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyiapkan Home…" : "Selesai dan buka Home"}
      </button>
      <button className="auth-reset-button" type="button" onClick={signOut}>
        Batal dan mulai ulang
      </button>
      <p className="auth-prototype-note">
        Setup untuk {user?.email ?? "akun baru"} hanya tersimpan selama sesi
        prototipe ini.
      </p>
    </form>
  );
}

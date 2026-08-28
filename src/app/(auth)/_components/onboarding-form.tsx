"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Banknote, Building2, Check, Smartphone } from "lucide-react";

import { AuthField } from "@/app/(auth)/_components/auth-field";
import { focusFirstError } from "@/app/(auth)/_components/focus-first-error";
import {
  completeOnboardingAction,
  type OnboardingActionState,
} from "@/app/(auth)/onboarding/actions";
import { authClient } from "@/lib/auth-client";
import { formatCurrency } from "@/lib/finance";
import {
  ONBOARDING_ACCOUNT_TYPES,
  parseOnboardingInput,
  type OnboardingAccountType,
  type OnboardingFieldErrors,
} from "@/lib/onboarding";

const accountChoices = [
  { type: ONBOARDING_ACCOUNT_TYPES[0], label: "Cash", icon: Banknote },
  { type: ONBOARDING_ACCOUNT_TYPES[1], label: "Bank", icon: Building2 },
  { type: ONBOARDING_ACCOUNT_TYPES[2], label: "E-Wallet", icon: Smartphone },
] as const;

const initialActionState: OnboardingActionState = {
  status: "idle",
  revision: 0,
};

export function OnboardingForm({ email }: { email: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [actionState, formAction, isPending] = useActionState(
    completeOnboardingAction,
    initialActionState,
  );
  const [name, setName] = useState("");
  const [type, setType] = useState<OnboardingAccountType>("BANK");
  const [balanceInput, setBalanceInput] = useState("0");
  const [clientErrors, setClientErrors] = useState<OnboardingFieldErrors>({});
  const [dismissedServerErrors, setDismissedServerErrors] = useState<
    Partial<Record<keyof OnboardingFieldErrors, number>>
  >({});
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const currentBalance = Number(balanceInput);
  const formattedBalance =
    /^\d+$/.test(balanceInput.trim()) &&
    Number.isSafeInteger(currentBalance) &&
    currentBalance >= 0
      ? formatCurrency(currentBalance)
      : "—";

  useEffect(() => {
    if (actionState.status !== "error" || !actionState.fieldErrors) return;

    if (formRef.current) {
      focusFirstError(formRef.current, Object.keys(actionState.fieldErrors));
    }
  }, [actionState]);

  function fieldError(field: keyof OnboardingFieldErrors) {
    return (
      clientErrors[field] ??
      (dismissedServerErrors[field] === actionState.revision
        ? undefined
        : actionState.fieldErrors?.[field])
    );
  }

  function clearFieldError(field: keyof OnboardingFieldErrors) {
    setClientErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
    setDismissedServerErrors((current) =>
      current[field] === actionState.revision
        ? current
        : { ...current, [field]: actionState.revision },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const parsedInput = parseOnboardingInput({
      accountName: name,
      accountType: type,
      currentBalance: balanceInput,
    });

    if (parsedInput.success) {
      setClientErrors({});
      return;
    }

    event.preventDefault();
    setClientErrors(parsedInput.fieldErrors);
    focusFirstError(event.currentTarget, Object.keys(parsedInput.fieldErrors));
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError("");

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setSignOutError("Belum berhasil keluar. Coba lagi.");
        setIsSigningOut(false);
        return;
      }

      router.replace("/welcome");
      router.refresh();
    } catch {
      setSignOutError("Belum berhasil keluar. Coba lagi.");
      setIsSigningOut(false);
    }
  }

  const accountNameError = fieldError("accountName");
  const accountTypeError = fieldError("accountType");
  const currentBalanceError = fieldError("currentBalance");

  return (
    <form
      ref={formRef}
      action={formAction}
      className="auth-form onboarding-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <AuthField
        id="account-name"
        label="Nama akun"
        name="accountName"
        placeholder="Contoh: BCA, GoPay, atau Cash…"
        autoComplete="off"
        value={name}
        error={accountNameError}
        onChange={(event) => {
          setName(event.target.value);
          clearFieldError("accountName");
        }}
        required
      />

      <fieldset
        className="account-type-field"
        aria-describedby={accountTypeError ? "account-type-error" : undefined}
      >
        <legend>Jenis akun</legend>
        <div className="account-type-options">
          {accountChoices.map(({ type: value, label, icon: Icon }) => (
            <label key={value}>
              <input
                type="radio"
                name="accountType"
                value={value}
                checked={type === value}
                aria-describedby={
                  accountTypeError ? "account-type-error" : undefined
                }
                onChange={() => {
                  setType(value);
                  clearFieldError("accountType");
                }}
              />
              <Icon aria-hidden="true" size={20} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {accountTypeError ? (
          <small id="account-type-error" role="alert">
            {accountTypeError}
          </small>
        ) : null}
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
            aria-describedby={
              currentBalanceError ? "current-balance-error" : "balance-help"
            }
            aria-invalid={Boolean(currentBalanceError)}
            onChange={(event) => {
              setBalanceInput(event.target.value);
              clearFieldError("currentBalance");
            }}
            required
          />
        </div>
        {currentBalanceError ? (
          <small id="current-balance-error" role="alert">
            {currentBalanceError}
          </small>
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

      {actionState.message ? (
        <p className="auth-prototype-note" role="alert">
          {actionState.message}
        </p>
      ) : null}

      {signOutError ? (
        <p className="auth-prototype-note" role="alert">
          {signOutError}
        </p>
      ) : null}

      <button
        className="primary-button auth-submit"
        type="submit"
        disabled={isPending || isSigningOut}
      >
        {isPending ? "Menyiapkan Home…" : "Selesai dan buka Home"}
      </button>
      <button
        className="auth-reset-button"
        type="button"
        disabled={isPending || isSigningOut}
        onClick={handleSignOut}
      >
        {isSigningOut ? "Keluar…" : "Batal dan keluar"}
      </button>
      <p className="auth-prototype-note">Setup akun untuk {email}.</p>
    </form>
  );
}

import type { FinanceSummary } from "./finance";

export const ACCOUNT_TYPES = ["CASH", "BANK", "EWALLET"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type PrototypeUser = {
  id: string;
  name: string;
  email: string;
  kind: "demo" | "new";
};

export type PrototypeAccount = {
  name: string;
  type: AccountType;
  currentBalance: number;
};

export type PrototypeAuthState =
  | { status: "signed-out"; user: null; account: null }
  | {
      status: "needs-onboarding";
      user: PrototypeUser;
      account: null;
    }
  | {
      status: "ready";
      user: PrototypeUser;
      account: PrototypeAccount;
    };

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
};

export type SignInInput = Pick<RegistrationInput, "email" | "password">;

export type AccountSetupInput = {
  name: string;
  type: string;
  currentBalance: number;
};

export type RegistrationErrors = Partial<
  Record<keyof RegistrationInput, string>
>;

export type SignInErrors = Partial<Record<keyof SignInInput, string>>;

export type AccountSetupErrors = Partial<
  Record<keyof AccountSetupInput, string>
>;

type MonthReference = Pick<FinanceSummary, "monthKey" | "monthLabel">;

const accountTypeSet = new Set<string>(ACCOUNT_TYPES);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(
  input: RegistrationInput,
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  if (input.name.trim().length < 2) {
    errors.name = "Nama minimal 2 karakter.";
  }
  if (!emailPattern.test(input.email.trim())) {
    errors.email = "Masukkan email yang valid.";
  }
  if (input.password.length < 8) {
    errors.password = "Password minimal 8 karakter.";
  }

  return errors;
}

export function validateSignIn(input: SignInInput): SignInErrors {
  const errors: SignInErrors = {};

  if (!emailPattern.test(input.email.trim())) {
    errors.email = "Masukkan email yang valid.";
  }
  if (!input.password) {
    errors.password = "Masukkan password.";
  }

  return errors;
}

export function validateAccountSetup(
  input: AccountSetupInput,
): AccountSetupErrors {
  const errors: AccountSetupErrors = {};

  if (!input.name.trim()) {
    errors.name = "Masukkan nama akun.";
  }
  if (!accountTypeSet.has(input.type)) {
    errors.type = "Pilih jenis akun yang tersedia.";
  }
  if (
    !Number.isSafeInteger(input.currentBalance) ||
    input.currentBalance < 0
  ) {
    errors.currentBalance =
      "Saldo harus berupa Rupiah utuh dan tidak negatif.";
  }

  return errors;
}

export function createOnboardingSummary(
  currentBalance: number,
  month: MonthReference,
): FinanceSummary {
  if (!Number.isSafeInteger(currentBalance) || currentBalance < 0) {
    throw new RangeError("Current balance must be a non-negative integer.");
  }

  return {
    available: currentBalance,
    spentThisMonth: 0,
    incomeThisMonth: 0,
    ...month,
  };
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "F";

  const first = parts[0][0];
  const last = parts.length > 1 ? parts.at(-1)?.[0] : "";
  return `${first}${last ?? ""}`.toLocaleUpperCase("id-ID");
}

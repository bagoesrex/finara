import { z } from "zod";

import type { SearchableTransaction } from "./finance";
import type { ContractParseResult } from "./transactions";

export const ACCOUNT_TYPES = ["CASH", "BANK", "EWALLET"] as const;
export const MAX_ACCOUNT_NAME_LENGTH = 40;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type FinanceAccount = {
  id: string;
  name: string;
  type: AccountType;
  currentBalance: number;
};

const accountNameSchema = z
  .string({ error: "Masukkan nama akun." })
  .trim()
  .min(1, "Masukkan nama akun.")
  .max(
    MAX_ACCOUNT_NAME_LENGTH,
    `Nama akun maksimal ${MAX_ACCOUNT_NAME_LENGTH} karakter.`,
  );

const updateAccountInputSchema = z
  .object({ name: accountNameSchema })
  .strict();

export const accountRenameDtoSchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(MAX_ACCOUNT_NAME_LENGTH),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export type ValidatedUpdateAccountInput = z.output<
  typeof updateAccountInputSchema
>;
export type AccountRenameDto = z.output<typeof accountRenameDtoSchema>;

export const accountTypeLabels: Record<AccountType, string> = {
  BANK: "Bank",
  CASH: "Tunai",
  EWALLET: "E-Wallet",
};

export type AccountNameValidation =
  | { status: "valid"; name: string }
  | { status: "invalid"; message: string };

export function validateAccountName(
  value: string,
  accounts: readonly FinanceAccount[],
  currentAccountId: string,
): AccountNameValidation {
  const name = value.trim();

  if (!name) {
    return { status: "invalid", message: "Masukkan nama akun." };
  }

  if (name.length > MAX_ACCOUNT_NAME_LENGTH) {
    return {
      status: "invalid",
      message: `Nama akun maksimal ${MAX_ACCOUNT_NAME_LENGTH} karakter.`,
    };
  }

  const normalizedName = name.toLocaleLowerCase("id-ID");
  const duplicate = accounts.some(
    (account) =>
      account.id !== currentAccountId &&
      account.name.toLocaleLowerCase("id-ID") === normalizedName,
  );

  if (duplicate) {
    return {
      status: "invalid",
      message: "Nama ini sudah dipakai akun lain.",
    };
  }

  return { status: "valid", name };
}

export function parseUpdateAccountInput(
  input: unknown,
): ContractParseResult<ValidatedUpdateAccountInput> {
  const result = updateAccountInputSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  const fieldErrors: Record<string, string> = {};
  let formError: string | undefined;

  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    } else if (!formError) {
      formError = issue.message;
    }
  }

  return { success: false, fieldErrors, formError };
}

export function isAccountId(value: string) {
  return z.uuid().safeParse(value).success;
}

type AccountBalanceTransaction = Pick<
  SearchableTransaction,
  "account" | "amount" | "type"
>;

function adjustAccountBalance(
  accounts: readonly FinanceAccount[],
  transaction: AccountBalanceTransaction,
  direction: 1 | -1,
): FinanceAccount[] {
  if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) {
    return [...accounts];
  }

  const transactionDelta =
    transaction.type === "EXPENSE" ? -transaction.amount : transaction.amount;

  return accounts.map((account) =>
    account.name === transaction.account
      ? {
          ...account,
          currentBalance:
            account.currentBalance + direction * transactionDelta,
        }
      : account,
  );
}

export function applyTransactionToAccounts(
  accounts: readonly FinanceAccount[],
  transaction: AccountBalanceTransaction,
): FinanceAccount[] {
  return adjustAccountBalance(accounts, transaction, 1);
}

export function removeTransactionFromAccounts(
  accounts: readonly FinanceAccount[],
  transaction: AccountBalanceTransaction,
): FinanceAccount[] {
  return adjustAccountBalance(accounts, transaction, -1);
}

export function replaceTransactionInAccounts(
  accounts: readonly FinanceAccount[],
  previousTransaction: AccountBalanceTransaction,
  nextTransaction: AccountBalanceTransaction,
): FinanceAccount[] {
  return applyTransactionToAccounts(
    removeTransactionFromAccounts(accounts, previousTransaction),
    nextTransaction,
  );
}

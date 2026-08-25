import type { SearchableTransaction } from "./finance";

export const ACCOUNT_TYPES = ["CASH", "BANK", "EWALLET"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type FinanceAccount = {
  id: string;
  name: string;
  type: AccountType;
  currentBalance: number;
};

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

  if (name.length > 40) {
    return {
      status: "invalid",
      message: "Nama akun maksimal 40 karakter.",
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

export function renameAccountReferences<
  TTransaction extends Pick<SearchableTransaction, "account">,
>(
  accounts: readonly FinanceAccount[],
  transactions: readonly TTransaction[],
  accountId: string,
  name: string,
): { accounts: FinanceAccount[]; transactions: TTransaction[] } {
  const account = accounts.find(({ id }) => id === accountId);
  if (!account) return { accounts: [...accounts], transactions: [...transactions] };

  return {
    accounts: accounts.map((item) =>
      item.id === accountId ? { ...item, name } : item,
    ),
    transactions: transactions.map((transaction) =>
      transaction.account === account.name
        ? { ...transaction, account: name }
        : transaction,
    ),
  };
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

import type { FinanceAccount } from "./accounts";
import { parseTransactionInput } from "./finance";
import type { FinanceCategory, TransactionDraft } from "./finance-query";

type CreateManualTransactionDraftOptions = {
  accounts: readonly FinanceAccount[];
  categories: readonly FinanceCategory[];
  referenceDate: string;
  text?: string;
};

export function createManualTransactionDraft({
  accounts,
  categories,
  referenceDate,
  text = "",
}: CreateManualTransactionDraftOptions): TransactionDraft | null {
  const normalizedText = text.trim();
  const parsed = parseTransactionInput(normalizedText, referenceDate);
  const transaction =
    parsed.status === "ready"
      ? parsed.transaction
      : {
          amount: 0,
          category: "Other",
          date: referenceDate,
          description: normalizedText || "Transaksi",
          type: "EXPENSE" as const,
        };
  const account = accounts[0];
  const category =
    categories.find(
      (item) =>
        item.type === transaction.type && item.name === transaction.category,
    ) ??
    categories.find(
      (item) => item.type === transaction.type && item.name === "Other",
    ) ??
    categories.find((item) => item.type === transaction.type);

  if (!account || !category) return null;

  return {
    ...transaction,
    accountId: account.id,
    account: account.name,
    categoryId: category.id,
    category: category.name,
  };
}

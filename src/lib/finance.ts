export type TransactionType = "INCOME" | "EXPENSE";

export type SearchableTransaction = {
  id: string;
  description: string;
  category: string;
  account: string;
  amount: number;
  type: TransactionType;
  date: string;
  time: string;
};

export type ParsedTransaction = {
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
};

export type ParseResult =
  | { status: "ready"; transaction: ParsedTransaction }
  | { status: "invalid"; message: string };

const integerFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return `Rp${integerFormatter.format(Math.abs(amount))}`;
}

export function formatCompactCurrency(amount: number): string {
  const absoluteAmount = Math.abs(amount);

  if (absoluteAmount >= 1_000_000) {
    return `Rp${decimalFormatter.format(absoluteAmount / 1_000_000)} jt`;
  }

  if (absoluteAmount >= 1_000) {
    return `Rp${decimalFormatter.format(absoluteAmount / 1_000)} rb`;
  }

  return formatCurrency(absoluteAmount);
}

function titleCaseFirst(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function parseAmount(rawValue: string, rawUnit: string | undefined): number {
  const normalizedValue = rawValue.replace(",", ".");
  const numericValue = Number.parseFloat(normalizedValue);
  const unit = rawUnit?.toLowerCase();

  if (unit === "jt" || unit === "juta") {
    return Math.round(numericValue * 1_000_000);
  }

  if (unit === "rb" || unit === "ribu" || unit === "k") {
    return Math.round(numericValue * 1_000);
  }

  return Math.round(numericValue);
}

function inferType(input: string): TransactionType {
  return /\b(gaji|salary|freelance|honor|pendapatan|masuk)\b/i.test(input)
    ? "INCOME"
    : "EXPENSE";
}

function inferCategory(input: string, type: TransactionType): string {
  if (type === "INCOME") {
    if (/\b(gaji|salary)\b/i.test(input)) return "Salary";
    if (/\b(freelance|honor)\b/i.test(input)) return "Freelance";
    return "Other";
  }

  if (/\b(makan|kopi|ngopi|lunch|food)\b/i.test(input)) return "Food & Drink";
  if (/\b(grab|gojek|bensin|transport|parkir)\b/i.test(input)) return "Transport";
  if (/\b(wifi|internet|listrik|tagihan)\b/i.test(input)) return "Bills";
  if (/\b(belanja|shopping)\b/i.test(input)) return "Shopping";
  if (/\b(film|bioskop|game|hiburan)\b/i.test(input)) return "Entertainment";
  return "Other";
}

export function parseTransactionInput(input: string): ParseResult {
  const normalizedInput = input.trim().replace(/\s+/g, " ");
  const amountMatch = normalizedInput.match(
    /(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?\b/i,
  );

  if (!amountMatch) {
    return {
      status: "invalid",
      message: "Tambahkan nominal, misalnya 25rb.",
    };
  }

  const amount = parseAmount(amountMatch[1], amountMatch[2]);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      status: "invalid",
      message: "Nominal harus lebih dari nol.",
    };
  }

  const type = inferType(normalizedInput);
  const description = titleCaseFirst(
    normalizedInput.replace(amountMatch[0], "").trim().replace(/[.,-]+$/, ""),
  );

  return {
    status: "ready",
    transaction: {
      amount,
      category: inferCategory(normalizedInput, type),
      description: description || (type === "INCOME" ? "Income" : "Expense"),
      type,
    },
  };
}

export function filterTransactions<T extends SearchableTransaction>(
  transactions: readonly T[],
  query: string,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");

  if (!normalizedQuery) return [...transactions];

  const numericQuery = normalizedQuery.replace(/\D/g, "");

  return transactions.filter((transaction) => {
    const text = [
      transaction.description,
      transaction.category,
      transaction.account,
    ]
      .join(" ")
      .toLocaleLowerCase("id-ID");

    return (
      text.includes(normalizedQuery) ||
      (numericQuery.length > 0 && String(transaction.amount).includes(numericQuery))
    );
  });
}

export function groupTransactionsByDate<T extends SearchableTransaction>(
  transactions: readonly T[],
): Array<{ date: string; transactions: T[] }> {
  const groups = new Map<string, T[]>();

  for (const transaction of transactions) {
    const dateGroup = groups.get(transaction.date) ?? [];
    dateGroup.push(transaction);
    groups.set(transaction.date, dateGroup);
  }

  return [...groups.entries()]
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, dateTransactions]) => ({
      date,
      transactions: dateTransactions.toSorted((a, b) =>
        b.time.localeCompare(a.time),
      ),
    }));
}

export function clampProgress(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.min(Math.max(spent / budget, 0), 1);
}

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
  date: string;
  description: string;
  time?: string;
  type: TransactionType;
};

export type FinanceSummary = {
  available: number;
  spentThisMonth: number;
  incomeThisMonth: number;
  monthKey: string;
  monthLabel: string;
};

export type BudgetAllocation = {
  id: string;
  category: string;
  amount: number;
  monthKey: string;
};

export type BudgetStatus =
  | "unused"
  | "on-track"
  | "near-limit"
  | "limit-reached"
  | "over";

export type BudgetProgress = BudgetAllocation & {
  spent: number;
  remaining: number;
  progress: number;
  status: BudgetStatus;
};

export type BudgetOverview = {
  allocated: number;
  spent: number;
  remaining: number;
  progress: number;
  budgets: BudgetProgress[];
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

export const expenseCategories = [
  "Food & Drink",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Other",
] as const;

export const incomeCategories = [
  "Salary",
  "Freelance",
  "Business",
  "Gift",
  "Other",
] as const;

type CurrencyAmount = number | bigint;

function getAbsoluteAmount(amount: CurrencyAmount) {
  if (typeof amount === "bigint") {
    return amount < BigInt(0) ? -amount : amount;
  }
  return Math.abs(amount);
}

export function formatCurrency(amount: CurrencyAmount): string {
  return `Rp${integerFormatter.format(getAbsoluteAmount(amount))}`;
}

export function formatSignedCurrency(amount: CurrencyAmount): string {
  return `${amount < 0 ? "−" : ""}${formatCurrency(amount)}`;
}

function formatCompactBigInt(
  amount: bigint,
  divisor: bigint,
  suffix: string,
) {
  const roundedHundredths =
    (amount * BigInt(100) + divisor / BigInt(2)) / divisor;
  const whole = roundedHundredths / BigInt(100);
  const fraction = roundedHundredths % BigInt(100);
  const fractionLabel =
    fraction === BigInt(0)
      ? ""
      : `,${fraction.toString().padStart(2, "0").replace(/0$/, "")}`;

  return `Rp${integerFormatter.format(whole)}${fractionLabel} ${suffix}`;
}

export function formatCompactCurrency(amount: CurrencyAmount): string {
  if (typeof amount === "bigint") {
    const absolute = getAbsoluteAmount(amount) as bigint;
    if (absolute >= BigInt(1_000_000)) {
      return formatCompactBigInt(absolute, BigInt(1_000_000), "jt");
    }
    if (absolute >= BigInt(1_000)) {
      return formatCompactBigInt(absolute, BigInt(1_000), "rb");
    }
    return formatCurrency(absolute);
  }

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

function getLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shiftedDate = new Date(Date.UTC(year, month - 1, day + days));
  return shiftedDate.toISOString().slice(0, 10);
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

function inferTime(input: string): string | undefined {
  if (/\btadi pagi\b/i.test(input)) return "08:00";
  if (/\btadi siang\b/i.test(input)) return "12:00";
  if (/\btadi sore\b/i.test(input)) return "17:00";
  if (/\btadi malam\b/i.test(input)) return "20:00";
  return undefined;
}

export function categoriesForType(type: TransactionType): readonly string[] {
  return type === "INCOME" ? incomeCategories : expenseCategories;
}

export function changeDraftType(
  draft: ParsedTransaction,
  type: TransactionType,
): ParsedTransaction {
  const categories = categoriesForType(type);
  return {
    ...draft,
    type,
    category: categories.includes(draft.category) ? draft.category : "Other",
  };
}

export function parseTransactionInput(
  input: string,
  referenceDate = getLocalIsoDate(new Date()),
): ParseResult {
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
    normalizedInput
      .replace(amountMatch[0], "")
      .replace(/\b(?:kemarin|hari ini|tadi (?:pagi|siang|sore|malam))\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.,-]+$/, ""),
  );
  const time = inferTime(normalizedInput);

  return {
    status: "ready",
    transaction: {
      amount,
      category: inferCategory(normalizedInput, type),
      date: /\bkemarin\b/i.test(normalizedInput)
        ? shiftIsoDate(referenceDate, -1)
        : referenceDate,
      description: description || (type === "INCOME" ? "Income" : "Expense"),
      ...(time ? { time } : {}),
      type,
    },
  };
}

type SummaryTransaction = Pick<SearchableTransaction, "amount" | "date" | "type">;

function adjustTransactionInSummary(
  summary: FinanceSummary,
  transaction: SummaryTransaction,
  direction: 1 | -1,
): FinanceSummary {
  const isCurrentMonth = transaction.date.startsWith(summary.monthKey);
  const isExpense = transaction.type === "EXPENSE";
  const availableDelta = isExpense ? -transaction.amount : transaction.amount;

  return {
    ...summary,
    available: summary.available + direction * availableDelta,
    spentThisMonth:
      summary.spentThisMonth +
      (isCurrentMonth && isExpense ? direction * transaction.amount : 0),
    incomeThisMonth:
      summary.incomeThisMonth +
      (isCurrentMonth && !isExpense ? direction * transaction.amount : 0),
  };
}

export function applyTransactionToSummary(
  summary: FinanceSummary,
  transaction: SummaryTransaction,
): FinanceSummary {
  return adjustTransactionInSummary(summary, transaction, 1);
}

export function removeTransactionFromSummary(
  summary: FinanceSummary,
  transaction: SummaryTransaction,
): FinanceSummary {
  return adjustTransactionInSummary(summary, transaction, -1);
}

export function replaceTransactionInSummary(
  summary: FinanceSummary,
  previousTransaction: SummaryTransaction,
  nextTransaction: SummaryTransaction,
): FinanceSummary {
  return applyTransactionToSummary(
    removeTransactionFromSummary(summary, previousTransaction),
    nextTransaction,
  );
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

function getBudgetStatus(spent: number, amount: number): BudgetStatus {
  if (spent > amount) return "over";
  if (spent === amount && amount > 0) return "limit-reached";
  if (spent === 0) return "unused";
  if (spent / amount >= 0.8) return "near-limit";
  return "on-track";
}

export function calculateBudgetOverview(
  allocations: readonly BudgetAllocation[],
  transactions: readonly SearchableTransaction[],
  monthKey: string,
): BudgetOverview {
  const activeAllocations = allocations.filter(
    (allocation) => allocation.monthKey === monthKey,
  );
  const budgetedCategories = new Set(
    activeAllocations.map(({ category }) => category),
  );
  const spendingByCategory = new Map<string, number>();

  for (const transaction of transactions) {
    if (
      transaction.type !== "EXPENSE" ||
      !transaction.date.startsWith(monthKey) ||
      !budgetedCategories.has(transaction.category)
    ) {
      continue;
    }

    spendingByCategory.set(
      transaction.category,
      (spendingByCategory.get(transaction.category) ?? 0) + transaction.amount,
    );
  }

  const budgets = activeAllocations.map((allocation) => {
    const spent = spendingByCategory.get(allocation.category) ?? 0;
    return {
      ...allocation,
      spent,
      remaining: allocation.amount - spent,
      progress: clampProgress(spent, allocation.amount),
      status: getBudgetStatus(spent, allocation.amount),
    };
  });
  const allocated = budgets.reduce((total, budget) => total + budget.amount, 0);
  const spent = budgets.reduce((total, budget) => total + budget.spent, 0);

  return {
    allocated,
    budgets,
    progress: clampProgress(spent, allocated),
    remaining: allocated - spent,
    spent,
  };
}

export function upsertBudgetAllocation(
  allocations: readonly BudgetAllocation[],
  nextAllocation: BudgetAllocation,
): BudgetAllocation[] {
  const existingAllocation = allocations.find(
    (allocation) =>
      allocation.id === nextAllocation.id ||
      (allocation.monthKey === nextAllocation.monthKey &&
        allocation.category === nextAllocation.category),
  );

  if (!existingAllocation) return [...allocations, nextAllocation];

  return allocations.map((allocation) =>
    allocation.id === existingAllocation.id
      ? { ...nextAllocation, id: existingAllocation.id }
      : allocation,
  );
}

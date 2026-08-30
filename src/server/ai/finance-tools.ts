import "server-only";

import type {
  AiComposerIntent,
  AiComposerResponse,
  AiFinanceAnswer,
} from "@/lib/ai-composer";
import { formatCurrency, formatSignedCurrency } from "@/lib/finance";
import {
  getMonthDateRange,
  getMonthKeyInTimeZone,
  type TransactionType,
} from "@/lib/transactions";
import { getBudgetOverview } from "@/server/budgets/service";
import { db } from "@/server/db/client";
import { getFinanceSnapshot } from "@/server/transactions/service";

type FinanceReadIntent = Exclude<
  AiComposerIntent,
  { intent: "CREATE_TRANSACTION" | "UNSUPPORTED" }
>;

type FinanceReadResponse =
  | AiFinanceAnswer
  | Extract<AiComposerResponse, { kind: "unsupported" }>;

type CategoryAmount = {
  categoryId: string;
  categoryName: string;
  amount: bigint;
};

function monthLabel(monthKey: string) {
  const label = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(getMonthDateRange(monthKey).start);
  return label.charAt(0).toLocaleUpperCase("id-ID") + label.slice(1);
}

function sameLabel(left: string, right: string) {
  return left.toLocaleLowerCase("id-ID") === right.toLocaleLowerCase("id-ID");
}

async function getMonthlyCategoryAmounts(
  userId: string,
  monthKey: string,
  type: TransactionType,
) {
  const range = getMonthDateRange(monthKey);
  const [categories, groupedAmounts] = await db.$transaction([
    db.category.findMany({
      where: { userId, type },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type,
        deletedAt: null,
        transactionDate: { gte: range.start, lt: range.end },
      },
      orderBy: { categoryId: "asc" },
      _sum: { amount: true },
    }),
  ]);
  const amountByCategory = new Map(
    groupedAmounts.map((entry) => [
      entry.categoryId,
      entry._sum?.amount ?? BigInt(0),
    ]),
  );
  const categoryAmounts: CategoryAmount[] = categories
    .map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      amount: amountByCategory.get(category.id) ?? BigInt(0),
    }))
    .sort((left, right) => {
      if (left.amount === right.amount) {
        return left.categoryName.localeCompare(right.categoryName, "id-ID");
      }
      return left.amount > right.amount ? -1 : 1;
    });
  const totalAmount = categoryAmounts.reduce(
    (total, category) => total + category.amount,
    BigInt(0),
  );

  return { categoryAmounts, monthLabel: monthLabel(monthKey), totalAmount };
}

async function answerBalance(
  userId: string,
  monthKey: string,
): Promise<AiFinanceAnswer> {
  const snapshot = await getFinanceSnapshot(userId, monthKey);
  return {
    kind: "finance_answer",
    label: "Saldo tersedia",
    value: formatSignedCurrency(BigInt(snapshot.availableBalance)),
    detail: `Dari ${snapshot.accounts.length} akun.`,
  };
}

async function answerSpendingSummary(
  userId: string,
  monthKey: string,
  intent: Extract<
    FinanceReadIntent,
    { intent: "GET_SPENDING_SUMMARY" }
  >,
): Promise<FinanceReadResponse> {
  const summary = await getMonthlyCategoryAmounts(
    userId,
    monthKey,
    intent.transactionType,
  );
  const typeLabel =
    intent.transactionType === "EXPENSE" ? "pengeluaran" : "pemasukan";

  if (intent.categoryHint) {
    const categoryHint = intent.categoryHint;
    const category = summary.categoryAmounts.find((item) =>
      sameLabel(item.categoryName, categoryHint),
    );
    if (!category) {
      return {
        kind: "unsupported",
        message: "Kategori belum dikenali. Coba gunakan nama kategori yang tersedia.",
      };
    }
    return {
      kind: "finance_answer",
      label: `${category.categoryName} bulan ini`,
      value: formatCurrency(category.amount),
      detail: `${typeLabel.charAt(0).toLocaleUpperCase("id-ID") + typeLabel.slice(1)} · ${summary.monthLabel}`,
    };
  }

  if (intent.ranking === "TOP_CATEGORY") {
    const topCategory = summary.categoryAmounts.find(
      (category) => category.amount > BigInt(0),
    );
    return {
      kind: "finance_answer",
      label: `Kategori ${typeLabel} terbesar`,
      value: topCategory?.categoryName ?? "Belum ada transaksi",
      detail: topCategory
        ? `${formatCurrency(topCategory.amount)} pada ${summary.monthLabel}.`
        : summary.monthLabel,
    };
  }

  return {
    kind: "finance_answer",
    label: `${typeLabel.charAt(0).toLocaleUpperCase("id-ID") + typeLabel.slice(1)} bulan ini`,
    value: formatCurrency(summary.totalAmount),
    detail: summary.monthLabel,
  };
}

async function answerBudget(
  userId: string,
  monthKey: string,
  categoryHint: string | null,
): Promise<FinanceReadResponse> {
  const overview = await getBudgetOverview(userId, monthKey);
  if (overview.budgets.length === 0) {
    return {
      kind: "finance_answer",
      label: "Budget bulan ini",
      value: "Belum ada budget",
      detail: "Atur budget dari menu Budget.",
    };
  }

  if (categoryHint) {
    const budget = overview.budgets.find((item) =>
      sameLabel(item.categoryName, categoryHint),
    );
    if (!budget) {
      return {
        kind: "unsupported",
        message: `Budget ${categoryHint} belum tersedia bulan ini.`,
      };
    }
    return {
      kind: "finance_answer",
      label: `Sisa budget ${budget.categoryName}`,
      value: formatSignedCurrency(BigInt(budget.remainingAmount)),
      detail: `Terpakai ${formatCurrency(BigInt(budget.spentAmount))} dari ${formatCurrency(BigInt(budget.amount))}.`,
    };
  }

  return {
    kind: "finance_answer",
    label: "Sisa budget bulan ini",
    value: formatSignedCurrency(BigInt(overview.remainingAmount)),
    detail: `Terpakai ${formatCurrency(BigInt(overview.spentAmount))} dari ${formatCurrency(BigInt(overview.allocatedAmount))}.`,
  };
}

export async function executeFinanceReadIntent(
  userId: string,
  intent: FinanceReadIntent,
  now = new Date(),
): Promise<FinanceReadResponse> {
  const monthKey = getMonthKeyInTimeZone(now);

  switch (intent.intent) {
    case "GET_BALANCE":
      return answerBalance(userId, monthKey);
    case "GET_SPENDING_SUMMARY":
      return answerSpendingSummary(userId, monthKey, intent);
    case "GET_BUDGET":
      return answerBudget(userId, monthKey, intent.categoryHint);
  }
}

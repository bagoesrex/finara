import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type {
  BudgetDto,
  BudgetOverviewDto,
  BudgetStatus,
  ValidatedCreateBudgetInput,
  ValidatedUpdateBudgetInput,
} from "@/lib/budgets";
import { getMonthDateRange } from "@/lib/transactions";
import { db } from "@/server/db/client";

const budgetSelect = {
  id: true,
  categoryId: true,
  category: { select: { name: true } },
  periodStart: true,
  amount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BudgetSelect;

type BudgetRecord = Prisma.BudgetGetPayload<{
  select: typeof budgetSelect;
}>;

export class BudgetNotFoundError extends Error {
  constructor() {
    super("Budget not found.");
    this.name = "BudgetNotFoundError";
  }
}

export class InvalidBudgetCategoryError extends Error {
  constructor() {
    super("Budget category is unavailable.");
    this.name = "InvalidBudgetCategoryError";
  }
}

export class BudgetConflictError extends Error {
  constructor() {
    super("A different allocation already exists for this category and month.");
    this.name = "BudgetConflictError";
  }
}

function toPeriodStart(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function toMonthKey(periodStart: Date) {
  return periodStart.toISOString().slice(0, 7);
}

function getProgressBasisPoints(spent: bigint, allocated: bigint) {
  if (allocated === BigInt(0)) return 0;

  const progress = (spent * BigInt(10_000)) / allocated;
  return Number(progress > BigInt(10_000) ? BigInt(10_000) : progress);
}

function getBudgetStatus(spent: bigint, amount: bigint): BudgetStatus {
  if (spent === BigInt(0)) return "UNUSED";
  if (spent > amount) return "OVER";
  if (spent === amount) return "LIMIT_REACHED";
  if (spent * BigInt(100) >= amount * BigInt(80)) return "NEAR_LIMIT";
  return "ON_TRACK";
}

function toBudgetDto(budget: BudgetRecord, spent: bigint): BudgetDto {
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.category.name,
    monthKey: toMonthKey(budget.periodStart),
    amount: budget.amount.toString(),
    spentAmount: spent.toString(),
    remainingAmount: (budget.amount - spent).toString(),
    progressBasisPoints: getProgressBasisPoints(spent, budget.amount),
    status: getBudgetStatus(spent, budget.amount),
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}

function getMonthLabel(monthKey: string) {
  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(toPeriodStart(monthKey));

  return monthLabel.charAt(0).toLocaleUpperCase("id-ID") + monthLabel.slice(1);
}

async function assertExpenseCategory(userId: string, categoryId: string) {
  const category = await db.category.findFirst({
    where: { id: categoryId, userId, type: "EXPENSE" },
    select: { id: true },
  });

  if (!category) throw new InvalidBudgetCategoryError();
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function findNaturalBudget(
  userId: string,
  input: ValidatedCreateBudgetInput,
) {
  return db.budget.findUnique({
    where: {
      userId_categoryId_periodStart: {
        userId,
        categoryId: input.categoryId,
        periodStart: toPeriodStart(input.month),
      },
    },
    select: { id: true, amount: true },
  });
}

async function resolveExistingBudget(
  userId: string,
  input: ValidatedCreateBudgetInput,
) {
  const existing = await findNaturalBudget(userId, input);
  if (!existing) return null;

  if (existing.amount !== input.amount) throw new BudgetConflictError();
  return existing.id;
}

async function getBudgetDtoForMonth(
  userId: string,
  budgetId: string,
  monthKey: string,
) {
  const overview = await getBudgetOverview(userId, monthKey);
  const budget = overview.budgets.find((item) => item.id === budgetId);
  if (!budget) throw new BudgetNotFoundError();
  return budget;
}

export async function createBudget(
  userId: string,
  input: ValidatedCreateBudgetInput,
): Promise<BudgetDto> {
  const existingId = await resolveExistingBudget(userId, input);
  if (existingId) {
    return getBudgetDtoForMonth(userId, existingId, input.month);
  }

  await assertExpenseCategory(userId, input.categoryId);

  let createdId: string;
  try {
    const created = await db.budget.create({
      data: {
        userId,
        categoryId: input.categoryId,
        amount: input.amount,
        periodStart: toPeriodStart(input.month),
      },
      select: { id: true },
    });
    createdId = created.id;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const concurrentId = await resolveExistingBudget(userId, input);
    if (!concurrentId) throw error;
    createdId = concurrentId;
  }

  return getBudgetDtoForMonth(userId, createdId, input.month);
}

export async function getBudgetOverview(
  userId: string,
  monthKey: string,
): Promise<BudgetOverviewDto> {
  const monthRange = getMonthDateRange(monthKey);
  const budgets = await db.budget.findMany({
    where: { userId, periodStart: monthRange.start },
    orderBy: [{ category: { name: "asc" } }, { id: "asc" }],
    select: budgetSelect,
  });

  const categoryIds = budgets.map((budget) => budget.categoryId);
  const spending =
    categoryIds.length === 0
      ? []
      : await db.transaction.groupBy({
          by: ["categoryId"],
          where: {
            userId,
            categoryId: { in: categoryIds },
            type: "EXPENSE",
            deletedAt: null,
            transactionDate: { gte: monthRange.start, lt: monthRange.end },
          },
          orderBy: { categoryId: "asc" },
          _sum: { amount: true },
        });

  const spentByCategory = new Map(
    spending.map((entry) => [
      entry.categoryId,
      entry._sum.amount ?? BigInt(0),
    ]),
  );

  let allocatedAmount = BigInt(0);
  let spentAmount = BigInt(0);
  const budgetDtos = budgets.map((budget) => {
    const categorySpent = spentByCategory.get(budget.categoryId) ?? BigInt(0);
    allocatedAmount += budget.amount;
    spentAmount += categorySpent;
    return toBudgetDto(budget, categorySpent);
  });

  return {
    monthKey,
    monthLabel: getMonthLabel(monthKey),
    allocatedAmount: allocatedAmount.toString(),
    spentAmount: spentAmount.toString(),
    remainingAmount: (allocatedAmount - spentAmount).toString(),
    progressBasisPoints: getProgressBasisPoints(spentAmount, allocatedAmount),
    budgets: budgetDtos,
  };
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  input: ValidatedUpdateBudgetInput,
): Promise<BudgetDto> {
  const current = await db.budget.findFirst({
    where: { id: budgetId, userId },
    select: { periodStart: true },
  });
  if (!current) throw new BudgetNotFoundError();

  const result = await db.budget.updateMany({
    where: { id: budgetId, userId },
    data: { amount: input.amount },
  });
  if (result.count !== 1) throw new BudgetNotFoundError();

  return getBudgetDtoForMonth(
    userId,
    budgetId,
    toMonthKey(current.periodStart),
  );
}

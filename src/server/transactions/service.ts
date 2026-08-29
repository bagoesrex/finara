import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type {
  FinanceSnapshotDto,
  TransactionDto,
  TransactionPageDto,
  ValidatedCreateTransactionInput,
  ValidatedListTransactionsInput,
  ValidatedUpdateTransactionInput,
} from "@/lib/transactions";
import { getMonthDateRange } from "@/lib/transactions";
import { db } from "@/server/db/client";

const transactionSelect = {
  id: true,
  accountId: true,
  account: { select: { name: true } },
  categoryId: true,
  category: { select: { name: true } },
  type: true,
  amount: true,
  description: true,
  transactionDate: true,
  transactionTime: true,
  clientRequestId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TransactionSelect;

type TransactionRecord = Prisma.TransactionGetPayload<{
  select: typeof transactionSelect;
}>;

type TransactionReferenceField = "accountId" | "categoryId";

export class TransactionNotFoundError extends Error {
  constructor() {
    super("Transaction not found.");
    this.name = "TransactionNotFoundError";
  }
}

export class InvalidTransactionReferenceError extends Error {
  constructor(readonly field: TransactionReferenceField) {
    super("Transaction reference is unavailable.");
    this.name = "InvalidTransactionReferenceError";
  }
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super("The request ID was already used for different transaction data.");
    this.name = "IdempotencyConflictError";
  }
}

function toDatabaseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDatabaseTime(value: string | null) {
  return value ? new Date(`1970-01-01T${value}:00.000Z`) : null;
}

function toCalendarDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toLocalTime(value: Date | null) {
  return value ? value.toISOString().slice(11, 16) : null;
}

function toTransactionDto(transaction: TransactionRecord): TransactionDto {
  return {
    id: transaction.id,
    accountId: transaction.accountId,
    accountName: transaction.account.name,
    categoryId: transaction.categoryId,
    categoryName: transaction.category.name,
    type: transaction.type,
    amount: transaction.amount.toString(),
    description: transaction.description,
    transactionDate: toCalendarDate(transaction.transactionDate),
    transactionTime: toLocalTime(transaction.transactionTime),
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

async function assertReferences(
  transaction: Prisma.TransactionClient,
  userId: string,
  input: ValidatedUpdateTransactionInput,
) {
  const [account, category] = await Promise.all([
    transaction.account.findFirst({
      where: { id: input.accountId, userId },
      select: { id: true },
    }),
    transaction.category.findFirst({
      where: { id: input.categoryId, userId, type: input.type },
      select: { id: true },
    }),
  ]);

  if (!account) {
    throw new InvalidTransactionReferenceError("accountId");
  }

  if (!category) {
    throw new InvalidTransactionReferenceError("categoryId");
  }
}

function isSameCreatePayload(
  transaction: TransactionRecord,
  input: ValidatedCreateTransactionInput,
) {
  return (
    transaction.accountId === input.accountId &&
    transaction.categoryId === input.categoryId &&
    transaction.type === input.type &&
    transaction.amount === input.amount &&
    transaction.description === input.description &&
    toCalendarDate(transaction.transactionDate) === input.transactionDate &&
    toLocalTime(transaction.transactionTime) === input.transactionTime
  );
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function resolveIdempotentTransaction(
  userId: string,
  input: ValidatedCreateTransactionInput,
) {
  const existing = await db.transaction.findUnique({
    where: {
      userId_clientRequestId: {
        userId,
        clientRequestId: input.clientRequestId,
      },
    },
    select: transactionSelect,
  });

  if (!existing) return null;

  if (!isSameCreatePayload(existing, input)) {
    throw new IdempotencyConflictError();
  }

  return toTransactionDto(existing);
}

export async function createTransaction(
  userId: string,
  input: ValidatedCreateTransactionInput,
): Promise<TransactionDto> {
  const existing = await resolveIdempotentTransaction(userId, input);
  if (existing) return existing;

  try {
    const created = await db.$transaction(async (transaction) => {
      await assertReferences(transaction, userId, input);

      return transaction.transaction.create({
        data: {
          userId,
          accountId: input.accountId,
          categoryId: input.categoryId,
          type: input.type,
          amount: input.amount,
          description: input.description,
          transactionDate: toDatabaseDate(input.transactionDate),
          transactionTime: toDatabaseTime(input.transactionTime),
          clientRequestId: input.clientRequestId,
        },
        select: transactionSelect,
      });
    });

    return toTransactionDto(created);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const concurrentResult = await resolveIdempotentTransaction(userId, input);
      if (concurrentResult) return concurrentResult;
    }

    throw error;
  }
}

export async function listTransactions(
  userId: string,
  input: ValidatedListTransactionsInput,
): Promise<TransactionPageDto> {
  if (input.cursor) {
    const cursorExists = await db.transaction.findFirst({
      where: { id: input.cursor, userId, deletedAt: null },
      select: { id: true },
    });

    if (!cursorExists) throw new TransactionNotFoundError();
  }

  const monthRange = input.month ? getMonthDateRange(input.month) : null;
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      deletedAt: null,
      type: input.type,
      transactionDate: monthRange
        ? { gte: monthRange.start, lt: monthRange.end }
        : undefined,
      OR: input.search
        ? [
            {
              description: { contains: input.search, mode: "insensitive" },
            },
            {
              account: {
                name: { contains: input.search, mode: "insensitive" },
              },
            },
            {
              category: {
                name: { contains: input.search, mode: "insensitive" },
              },
            },
          ]
        : undefined,
    },
    orderBy: [
      { transactionDate: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    cursor: input.cursor ? { id: input.cursor } : undefined,
    skip: input.cursor ? 1 : undefined,
    take: input.limit + 1,
    select: transactionSelect,
  });

  const hasNextPage = transactions.length > input.limit;
  const page = hasNextPage ? transactions.slice(0, input.limit) : transactions;

  return {
    items: page.map(toTransactionDto),
    nextCursor: hasNextPage ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function getTransaction(
  userId: string,
  transactionId: string,
): Promise<TransactionDto> {
  const transaction = await db.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: null },
    select: transactionSelect,
  });

  if (!transaction) throw new TransactionNotFoundError();
  return toTransactionDto(transaction);
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: ValidatedUpdateTransactionInput,
): Promise<TransactionDto> {
  return db.$transaction(async (transaction) => {
    const current = await transaction.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!current) throw new TransactionNotFoundError();
    await assertReferences(transaction, userId, input);

    const updateResult = await transaction.transaction.updateMany({
      where: { id: transactionId, userId, deletedAt: null },
      data: {
        accountId: input.accountId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount,
        description: input.description,
        transactionDate: toDatabaseDate(input.transactionDate),
        transactionTime: toDatabaseTime(input.transactionTime),
      },
    });

    if (updateResult.count !== 1) throw new TransactionNotFoundError();

    const updated = await transaction.transaction.findFirst({
      where: { id: transactionId, userId, deletedAt: null },
      select: transactionSelect,
    });

    if (!updated) throw new TransactionNotFoundError();
    return toTransactionDto(updated);
  });
}

export async function softDeleteTransaction(
  userId: string,
  transactionId: string,
): Promise<void> {
  const result = await db.transaction.updateMany({
    where: { id: transactionId, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (result.count !== 1) throw new TransactionNotFoundError();
}

function toClientAccountType(
  type: "CASH" | "BANK" | "E_WALLET",
): "CASH" | "BANK" | "EWALLET" {
  return type === "E_WALLET" ? "EWALLET" : type;
}

export async function getFinanceSnapshot(
  userId: string,
  monthKey: string,
): Promise<FinanceSnapshotDto> {
  const monthRange = getMonthDateRange(monthKey);
  const [accounts, categories, accountSums, monthlyExpense, monthlyIncome] =
    await db.$transaction([
      db.account.findMany({
        where: { userId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          type: true,
          openingBalance: true,
        },
      }),
      db.category.findMany({
        where: { userId },
        orderBy: [{ type: "asc" }, { name: "asc" }, { id: "asc" }],
        select: { id: true, name: true, type: true },
      }),
      db.transaction.groupBy({
        by: ["accountId", "type"],
        where: { userId, deletedAt: null },
        orderBy: [{ accountId: "asc" }, { type: "asc" }],
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: {
          userId,
          deletedAt: null,
          type: "EXPENSE",
          transactionDate: { gte: monthRange.start, lt: monthRange.end },
        },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: {
          userId,
          deletedAt: null,
          type: "INCOME",
          transactionDate: { gte: monthRange.start, lt: monthRange.end },
        },
        _sum: { amount: true },
      }),
    ]);

  const balanceDeltas = new Map<string, bigint>();
  for (const sum of accountSums) {
    const amount = sum._sum?.amount ?? BigInt(0);
    const signedAmount = sum.type === "EXPENSE" ? -amount : amount;
    balanceDeltas.set(
      sum.accountId,
      (balanceDeltas.get(sum.accountId) ?? BigInt(0)) + signedAmount,
    );
  }

  let availableBalance = BigInt(0);
  const accountDtos = accounts.map((account) => {
    const currentBalance =
      account.openingBalance + (balanceDeltas.get(account.id) ?? BigInt(0));
    availableBalance += currentBalance;

    return {
      id: account.id,
      name: account.name,
      type: toClientAccountType(account.type),
      currentBalance: currentBalance.toString(),
    };
  });

  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(monthRange.start);

  return {
    monthKey,
    monthLabel: monthLabel.charAt(0).toLocaleUpperCase("id-ID") + monthLabel.slice(1),
    availableBalance: availableBalance.toString(),
    monthlyExpense: (monthlyExpense._sum.amount ?? BigInt(0)).toString(),
    monthlyIncome: (monthlyIncome._sum.amount ?? BigInt(0)).toString(),
    accounts: accountDtos,
    categories,
  };
}

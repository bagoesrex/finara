import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { db } from "../src/server/db/client";
import {
  IdempotencyConflictError,
  InvalidTransactionReferenceError,
  TransactionNotFoundError,
  createTransaction,
  getFinanceSnapshot,
  getTransaction,
  listTransactions,
  softDeleteTransaction,
  updateTransaction,
} from "../src/server/transactions/service";

async function expectError<TError extends Error>(
  operation: () => Promise<unknown>,
  ErrorType: new (...arguments_: never[]) => TError,
) {
  let caught: unknown;

  try {
    await operation();
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof ErrorType);
  return caught;
}

async function checkTransactionService() {
  const userIds: string[] = [];

  try {
    const owner = await db.user.create({
      data: {
        email: `transaction-service-${randomUUID()}@example.test`,
        name: "Transaction Service Owner",
      },
    });
    const otherUser = await db.user.create({
      data: {
        email: `transaction-service-${randomUUID()}@example.test`,
        name: "Other Transaction Service Owner",
      },
    });
    userIds.push(owner.id, otherUser.id);

    const account = await db.account.create({
      data: {
        userId: owner.id,
        name: "BCA",
        type: "BANK",
        openingBalance: BigInt("100000"),
      },
    });
    const otherAccount = await db.account.create({
      data: {
        userId: otherUser.id,
        name: "Other cash",
        type: "CASH",
        openingBalance: BigInt("0"),
      },
    });
    const expenseCategory = await db.category.create({
      data: { userId: owner.id, name: "Food & Drink", type: "EXPENSE" },
    });
    const incomeCategory = await db.category.create({
      data: { userId: owner.id, name: "Salary", type: "INCOME" },
    });
    await db.category.create({
      data: { userId: otherUser.id, name: "Other", type: "EXPENSE" },
    });

    const createInput = {
      accountId: account.id,
      categoryId: expenseCategory.id,
      type: "EXPENSE" as const,
      amount: BigInt("25000"),
      description: "Makan ayam",
      transactionDate: "2026-08-28",
      transactionTime: "12:30",
      clientRequestId: randomUUID(),
    };

    const created = await createTransaction(owner.id, createInput);
    const retried = await createTransaction(owner.id, createInput);
    assert.equal(created.id, retried.id);
    assert.equal(created.amount, "25000");
    assert.equal(created.accountId, account.id);
    assert.equal(created.categoryId, expenseCategory.id);

    await expectError(
      () =>
        createTransaction(owner.id, {
          ...createInput,
          amount: BigInt("30000"),
        }),
      IdempotencyConflictError,
    );

    const crossUserError = await expectError(
      () =>
        createTransaction(owner.id, {
          ...createInput,
          accountId: otherAccount.id,
          clientRequestId: randomUUID(),
        }),
      InvalidTransactionReferenceError,
    );
    assert.equal(crossUserError.field, "accountId");

    const page = await listTransactions(owner.id, {
      cursor: undefined,
      limit: 20,
      month: "2026-08",
      search: "ayam",
      type: undefined,
    });
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0]?.id, created.id);
    assert.equal(page.nextCursor, null);

    const expenseSnapshot = await getFinanceSnapshot(owner.id, "2026-08");
    assert.equal(expenseSnapshot.availableBalance, "75000");
    assert.equal(expenseSnapshot.monthlyExpense, "25000");
    assert.equal(expenseSnapshot.accounts[0]?.currentBalance, "75000");

    await expectError(
      () => getTransaction(otherUser.id, created.id),
      TransactionNotFoundError,
    );

    const updated = await updateTransaction(owner.id, created.id, {
      accountId: account.id,
      categoryId: incomeCategory.id,
      type: "INCOME",
      amount: BigInt("50000"),
      description: "Gaji tambahan",
      transactionDate: "2026-08-28",
      transactionTime: null,
    });
    assert.equal(updated.type, "INCOME");
    assert.equal(updated.amount, "50000");
    assert.equal(updated.transactionTime, null);

    const incomeSnapshot = await getFinanceSnapshot(owner.id, "2026-08");
    assert.equal(incomeSnapshot.availableBalance, "150000");
    assert.equal(incomeSnapshot.monthlyExpense, "0");

    await softDeleteTransaction(owner.id, created.id);
    await expectError(
      () => getTransaction(owner.id, created.id),
      TransactionNotFoundError,
    );
    await expectError(
      () => softDeleteTransaction(owner.id, created.id),
      TransactionNotFoundError,
    );

    const deletedSnapshot = await getFinanceSnapshot(owner.id, "2026-08");
    assert.equal(deletedSnapshot.availableBalance, "100000");
    assert.equal(deletedSnapshot.monthlyExpense, "0");
    assert.equal(
      (
        await listTransactions(owner.id, {
          cursor: undefined,
          limit: 20,
          month: undefined,
          search: undefined,
          type: undefined,
        })
      ).items.length,
      0,
    );
  } finally {
    if (userIds.length > 0) {
      await db.transaction.deleteMany({ where: { userId: { in: userIds } } });
      await db.category.deleteMany({ where: { userId: { in: userIds } } });
      await db.account.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }
}

checkTransactionService()
  .then(() => {
    console.info("Transaction service verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("Transaction service verification failed.");
    console.error(error);
    process.exitCode = 1;
  });

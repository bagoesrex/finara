import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { Prisma } from "../src/generated/prisma/client";
import { db } from "../src/server/db/client";

const exactAmount = BigInt("9007199254740993");

async function expectDatabaseRejection(
  operation: () => Promise<unknown>,
  expectedConstraint: RegExp,
) {
  let rejected = false;

  try {
    await operation();
  } catch (error) {
    rejected = true;
    assert.match(String(error), expectedConstraint);
  }

  assert.equal(rejected, true, "Database accepted an invalid transaction.");
}

async function checkTransactionSchema() {
  const userIds: string[] = [];

  try {
    const owner = await db.user.create({
      data: {
        email: `transaction-schema-${randomUUID()}@example.test`,
        name: "Transaction Owner",
      },
    });
    const otherUser = await db.user.create({
      data: {
        email: `transaction-schema-${randomUUID()}@example.test`,
        name: "Other Transaction Owner",
      },
    });
    userIds.push(owner.id, otherUser.id);

    const ownerAccount = await db.account.create({
      data: {
        userId: owner.id,
        name: "Owner account",
        type: "BANK",
        openingBalance: BigInt("1000000"),
      },
    });
    const otherAccount = await db.account.create({
      data: {
        userId: otherUser.id,
        name: "Other account",
        type: "CASH",
        openingBalance: BigInt("0"),
      },
    });
    const ownerExpenseCategory = await db.category.create({
      data: { userId: owner.id, name: "Food", type: "EXPENSE" },
    });
    const ownerIncomeCategory = await db.category.create({
      data: { userId: owner.id, name: "Salary", type: "INCOME" },
    });
    const otherExpenseCategory = await db.category.create({
      data: { userId: otherUser.id, name: "Food", type: "EXPENSE" },
    });

    const clientRequestId = randomUUID();
    const transaction = await db.transaction.create({
      data: {
        userId: owner.id,
        accountId: ownerAccount.id,
        categoryId: ownerExpenseCategory.id,
        type: "EXPENSE",
        amount: exactAmount,
        description: "Schema precision check",
        transactionDate: new Date("2026-08-28T00:00:00.000Z"),
        transactionTime: new Date("1970-01-01T08:30:00.000Z"),
        clientRequestId,
      },
    });

    assert.equal(transaction.amount, exactAmount);
    assert.equal(transaction.deletedAt, null);
    assert.equal(transaction.clientRequestId, clientRequestId);

    await expectDatabaseRejection(
      () =>
        db.transaction.create({
          data: {
            userId: owner.id,
            accountId: ownerAccount.id,
            categoryId: ownerExpenseCategory.id,
            type: "EXPENSE",
            amount: BigInt("1"),
            description: "Duplicate request",
            transactionDate: new Date("2026-08-28T00:00:00.000Z"),
            clientRequestId,
          },
        }),
      /Transaction_userId_clientRequestId_key|Unique constraint/,
    );

    await expectDatabaseRejection(
      () =>
        db.transaction.create({
          data: {
            userId: owner.id,
            accountId: otherAccount.id,
            categoryId: ownerExpenseCategory.id,
            type: "EXPENSE",
            amount: BigInt("1"),
            description: "Cross-user account",
            transactionDate: new Date("2026-08-28T00:00:00.000Z"),
            clientRequestId: randomUUID(),
          },
        }),
      /Transaction_accountId_userId_fkey|Foreign key constraint/,
    );

    await expectDatabaseRejection(
      () =>
        db.transaction.create({
          data: {
            userId: owner.id,
            accountId: ownerAccount.id,
            categoryId: otherExpenseCategory.id,
            type: "EXPENSE",
            amount: BigInt("1"),
            description: "Cross-user category",
            transactionDate: new Date("2026-08-28T00:00:00.000Z"),
            clientRequestId: randomUUID(),
          },
        }),
      /Transaction_categoryId_userId_type_fkey|Foreign key constraint/,
    );

    await expectDatabaseRejection(
      () =>
        db.transaction.create({
          data: {
            userId: owner.id,
            accountId: ownerAccount.id,
            categoryId: ownerIncomeCategory.id,
            type: "EXPENSE",
            amount: BigInt("1"),
            description: "Mismatched category type",
            transactionDate: new Date("2026-08-28T00:00:00.000Z"),
            clientRequestId: randomUUID(),
          },
        }),
      /Transaction_categoryId_userId_type_fkey|Foreign key constraint/,
    );

    await expectDatabaseRejection(
      () =>
        db.transaction.create({
          data: {
            userId: owner.id,
            accountId: ownerAccount.id,
            categoryId: ownerExpenseCategory.id,
            type: "EXPENSE",
            amount: BigInt("0"),
            description: "Invalid amount",
            transactionDate: new Date("2026-08-28T00:00:00.000Z"),
            clientRequestId: randomUUID(),
          },
        }),
      /Transaction_amount_positive/,
    );

    await expectDatabaseRejection(
      () =>
        db.transaction.create({
          data: {
            userId: owner.id,
            accountId: ownerAccount.id,
            categoryId: ownerExpenseCategory.id,
            type: "EXPENSE",
            amount: BigInt("1"),
            description: "   ",
            transactionDate: new Date("2026-08-28T00:00:00.000Z"),
            clientRequestId: randomUUID(),
          },
        }),
      /Transaction_description_nonempty/,
    );

    await db.transaction.update({
      where: { id: transaction.id },
      data: { deletedAt: new Date() },
    });

    const activeTransactions = await db.transaction.findMany({
      where: { userId: owner.id, deletedAt: null },
    });
    assert.equal(activeTransactions.length, 0);

    const allTransactions = await db.transaction.findMany({
      where: { userId: owner.id },
    });
    assert.equal(allTransactions.length, 1);
  } finally {
    if (userIds.length > 0) {
      await db.transaction.deleteMany({ where: { userId: { in: userIds } } });
      await db.category.deleteMany({ where: { userId: { in: userIds } } });
      await db.account.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }
}

checkTransactionSchema()
  .then(() => {
    console.info("Transaction schema verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Transaction schema verification failed (${error.code}).`);
    } else {
      console.error("Transaction schema verification failed.");
    }
    console.error(error);
    process.exitCode = 1;
  });

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
  let caught: unknown;

  try {
    await operation();
  } catch (error) {
    caught = error;
  }

  assert.ok(caught, "Database accepted an invalid Budget.");
  assert.match(String(caught), expectedConstraint);
}

async function checkBudgetSchema() {
  const userIds: string[] = [];

  try {
    const owner = await db.user.create({
      data: {
        email: `budget-schema-${randomUUID()}@example.test`,
        name: "Budget Owner",
      },
    });
    const otherUser = await db.user.create({
      data: {
        email: `budget-schema-${randomUUID()}@example.test`,
        name: "Other Budget Owner",
      },
    });
    userIds.push(owner.id, otherUser.id);

    const expenseCategory = await db.category.create({
      data: { userId: owner.id, name: "Food", type: "EXPENSE" },
    });
    const incomeCategory = await db.category.create({
      data: { userId: owner.id, name: "Salary", type: "INCOME" },
    });
    const otherExpenseCategory = await db.category.create({
      data: { userId: otherUser.id, name: "Food", type: "EXPENSE" },
    });

    const budget = await db.budget.create({
      data: {
        userId: owner.id,
        categoryId: expenseCategory.id,
        amount: exactAmount,
        periodStart: new Date("2026-08-01T00:00:00.000Z"),
      },
    });

    assert.equal(budget.amount, exactAmount);
    assert.equal(budget.categoryType, "EXPENSE");
    assert.equal(budget.periodStart.toISOString().slice(0, 10), "2026-08-01");

    await expectDatabaseRejection(
      () =>
        db.budget.create({
          data: {
            userId: owner.id,
            categoryId: expenseCategory.id,
            amount: BigInt(1),
            periodStart: new Date("2026-08-01T00:00:00.000Z"),
          },
        }),
      /Budget_userId_categoryId_periodStart_key|Unique constraint/,
    );

    await expectDatabaseRejection(
      () =>
        db.budget.create({
          data: {
            userId: owner.id,
            categoryId: otherExpenseCategory.id,
            amount: BigInt(1),
            periodStart: new Date("2026-09-01T00:00:00.000Z"),
          },
        }),
      /Budget_categoryId_userId_categoryType_fkey|Foreign key constraint/,
    );

    await expectDatabaseRejection(
      () =>
        db.budget.create({
          data: {
            userId: owner.id,
            categoryId: incomeCategory.id,
            amount: BigInt(1),
            periodStart: new Date("2026-09-01T00:00:00.000Z"),
          },
        }),
      /Budget_categoryId_userId_categoryType_fkey|Foreign key constraint/,
    );

    await expectDatabaseRejection(
      () =>
        db.budget.create({
          data: {
            userId: owner.id,
            categoryId: incomeCategory.id,
            categoryType: "INCOME",
            amount: BigInt(1),
            periodStart: new Date("2026-09-01T00:00:00.000Z"),
          },
        }),
      /Budget_category_type_expense/,
    );

    await expectDatabaseRejection(
      () =>
        db.budget.create({
          data: {
            userId: owner.id,
            categoryId: expenseCategory.id,
            amount: BigInt(0),
            periodStart: new Date("2026-09-01T00:00:00.000Z"),
          },
        }),
      /Budget_amount_positive/,
    );

    await expectDatabaseRejection(
      () =>
        db.budget.create({
          data: {
            userId: owner.id,
            categoryId: expenseCategory.id,
            amount: BigInt(1),
            periodStart: new Date("2026-09-02T00:00:00.000Z"),
          },
        }),
      /Budget_period_first_day/,
    );
  } finally {
    if (userIds.length > 0) {
      await db.budget.deleteMany({ where: { userId: { in: userIds } } });
      await db.transaction.deleteMany({ where: { userId: { in: userIds } } });
      await db.category.deleteMany({ where: { userId: { in: userIds } } });
      await db.account.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }
}

checkBudgetSchema()
  .then(() => {
    console.info("Budget schema verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Budget schema verification failed (${error.code}).`);
    } else {
      console.error("Budget schema verification failed.");
    }
    console.error(error);
    process.exitCode = 1;
  });

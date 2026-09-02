import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/server/db/client";
import {
  BudgetConflictError,
  BudgetNotFoundError,
  InvalidBudgetCategoryError,
  createBudget,
  getBudgetOverview,
  updateBudget,
} from "../src/server/budgets/service";

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

async function checkBudgetService() {
  const userIds: string[] = [];

  try {
    const owner = await db.user.create({
      data: {
        email: `budget-service-${randomUUID()}@example.test`,
        name: "Budget Service Owner",
      },
    });
    const otherUser = await db.user.create({
      data: {
        email: `budget-service-${randomUUID()}@example.test`,
        name: "Other Budget Service Owner",
      },
    });
    userIds.push(owner.id, otherUser.id);

    const account = await db.account.create({
      data: {
        userId: owner.id,
        name: "BCA",
        type: "BANK",
        openingBalance: BigInt("1000000"),
      },
    });
    const food = await db.category.create({
      data: { userId: owner.id, name: "Food", type: "EXPENSE" },
    });
    const transport = await db.category.create({
      data: { userId: owner.id, name: "Transport", type: "EXPENSE" },
    });
    const unbudgeted = await db.category.create({
      data: { userId: owner.id, name: "Other", type: "EXPENSE" },
    });
    const salary = await db.category.create({
      data: { userId: owner.id, name: "Salary", type: "INCOME" },
    });
    const otherFood = await db.category.create({
      data: { userId: otherUser.id, name: "Food", type: "EXPENSE" },
    });

    const foodInput = {
      amount: BigInt("100000"),
      categoryId: food.id,
      month: "2026-08",
    };
    const foodBudget = await createBudget(owner.id, foodInput);
    const retriedFoodBudget = await createBudget(owner.id, foodInput);
    assert.equal(foodBudget.id, retriedFoodBudget.id);
    assert.equal(foodBudget.amount, "100000");
    assert.equal(foodBudget.status, "UNUSED");

    const transportInput = {
      amount: BigInt("50000"),
      categoryId: transport.id,
      month: "2026-08",
    };
    const concurrentTransportBudgets = await Promise.all(
      Array.from({ length: 4 }, () => createBudget(owner.id, transportInput)),
    );
    assert.equal(
      new Set(concurrentTransportBudgets.map((budget) => budget.id)).size,
      1,
    );
    assert.equal(
      await db.budget.count({
        where: {
          userId: owner.id,
          categoryId: transport.id,
          periodStart: new Date("2026-08-01T00:00:00.000Z"),
        },
      }),
      1,
    );

    await expectError(
      () =>
        createBudget(owner.id, {
          ...foodInput,
          amount: BigInt("120000"),
        }),
      BudgetConflictError,
    );
    await expectError(
      () =>
        createBudget(owner.id, {
          amount: BigInt("10000"),
          categoryId: otherFood.id,
          month: "2026-08",
        }),
      InvalidBudgetCategoryError,
    );
    await expectError(
      () =>
        createBudget(owner.id, {
          amount: BigInt("10000"),
          categoryId: salary.id,
          month: "2026-08",
        }),
      InvalidBudgetCategoryError,
    );

    const baseTransaction = {
      userId: owner.id,
      accountId: account.id,
      type: "EXPENSE" as const,
      description: "Budget service fixture",
      transactionTime: null,
    };
    await db.transaction.createMany({
      data: [
        {
          ...baseTransaction,
          categoryId: food.id,
          amount: BigInt("85000"),
          transactionDate: new Date("2026-08-15T00:00:00.000Z"),
          clientRequestId: randomUUID(),
        },
        {
          ...baseTransaction,
          categoryId: food.id,
          amount: BigInt("999000"),
          transactionDate: new Date("2026-07-31T00:00:00.000Z"),
          clientRequestId: randomUUID(),
        },
        {
          ...baseTransaction,
          categoryId: food.id,
          amount: BigInt("70000"),
          transactionDate: new Date("2026-08-20T00:00:00.000Z"),
          clientRequestId: randomUUID(),
          deletedAt: new Date(),
        },
        {
          ...baseTransaction,
          categoryId: unbudgeted.id,
          amount: BigInt("12345"),
          transactionDate: new Date("2026-08-20T00:00:00.000Z"),
          clientRequestId: randomUUID(),
        },
      ],
    });

    const overview = await getBudgetOverview(owner.id, "2026-08");
    assert.equal(overview.monthKey, "2026-08");
    assert.equal(overview.monthLabel, "Agustus 2026");
    assert.equal(overview.allocatedAmount, "150000");
    assert.equal(overview.spentAmount, "85000");
    assert.equal(overview.remainingAmount, "65000");
    assert.equal(overview.progressBasisPoints, 5666);
    assert.equal(overview.budgets.length, 2);

    const foodResult = overview.budgets.find(
      (budget) => budget.id === foodBudget.id,
    );
    assert.ok(foodResult);
    assert.equal(foodResult.spentAmount, "85000");
    assert.equal(foodResult.remainingAmount, "15000");
    assert.equal(foodResult.progressBasisPoints, 8500);
    assert.equal(foodResult.status, "NEAR_LIMIT");

    const transportResult = overview.budgets.find(
      (budget) => budget.categoryId === transport.id,
    );
    assert.ok(transportResult);
    assert.equal(transportResult.spentAmount, "0");
    assert.equal(transportResult.status, "UNUSED");

    const atLimit = await updateBudget(owner.id, foodBudget.id, {
      amount: BigInt("85000"),
    });
    assert.equal(atLimit.status, "LIMIT_REACHED");

    const atNearLimitBoundary = await updateBudget(owner.id, foodBudget.id, {
      amount: BigInt("106250"),
    });
    assert.equal(atNearLimitBoundary.status, "NEAR_LIMIT");

    const belowNearLimitBoundary = await updateBudget(owner.id, foodBudget.id, {
      amount: BigInt("106251"),
    });
    assert.equal(belowNearLimitBoundary.status, "ON_TRACK");

    const updated = await updateBudget(owner.id, foodBudget.id, {
      amount: BigInt("80000"),
    });
    assert.equal(updated.amount, "80000");
    assert.equal(updated.remainingAmount, "-5000");
    assert.equal(updated.progressBasisPoints, 10000);
    assert.equal(updated.status, "OVER");

    await expectError(
      () => updateBudget(otherUser.id, foodBudget.id, { amount: BigInt(1) }),
      BudgetNotFoundError,
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

checkBudgetService()
  .then(() => {
    console.info("Budget service verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("Budget service verification failed.");
    console.error(error);
    process.exitCode = 1;
  });

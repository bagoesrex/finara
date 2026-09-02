import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/server/db/client";
import { executeFinanceReadIntent } from "../src/server/ai/finance-tools";

const now = new Date("2026-08-30T10:00:00.000Z");

async function expectFinanceAnswer(
  responsePromise: ReturnType<typeof executeFinanceReadIntent>,
) {
  const response = await responsePromise;
  if (response.kind !== "finance_answer") {
    assert.fail(`Expected a finance answer, received ${response.kind}.`);
  }
  return response;
}

async function checkAiFinanceTools() {
  const userIds: string[] = [];

  try {
    const owner = await db.user.create({
      data: {
        email: `ai-finance-owner-${randomUUID()}@example.test`,
        name: "AI Finance Owner",
      },
    });
    userIds.push(owner.id);
    const otherUser = await db.user.create({
      data: {
        email: `ai-finance-other-${randomUUID()}@example.test`,
        name: "AI Finance Other",
      },
    });
    userIds.push(otherUser.id);
    const exactUser = await db.user.create({
      data: {
        email: `ai-finance-exact-${randomUUID()}@example.test`,
        name: "AI Finance Exact",
      },
    });
    userIds.push(exactUser.id);

    const account = await db.account.create({
      data: {
        userId: owner.id,
        name: "BCA",
        type: "BANK",
        openingBalance: BigInt("1000000"),
      },
    });
    const otherAccount = await db.account.create({
      data: {
        userId: otherUser.id,
        name: "Other Bank",
        type: "BANK",
        openingBalance: BigInt("9000000"),
      },
    });
    await db.account.create({
      data: {
        userId: exactUser.id,
        name: "Exact Bank",
        type: "BANK",
        openingBalance: BigInt("9007199254740993"),
      },
    });

    const food = await db.category.create({
      data: { userId: owner.id, name: "Food & Drink", type: "EXPENSE" },
    });
    const transport = await db.category.create({
      data: { userId: owner.id, name: "Transport", type: "EXPENSE" },
    });
    const salary = await db.category.create({
      data: { userId: owner.id, name: "Salary", type: "INCOME" },
    });
    const otherFood = await db.category.create({
      data: {
        userId: otherUser.id,
        name: "Food & Drink",
        type: "EXPENSE",
      },
    });

    const ownerTransaction = {
      userId: owner.id,
      accountId: account.id,
      description: "AI finance fixture",
      transactionTime: null,
    };
    await db.transaction.createMany({
      data: [
        {
          ...ownerTransaction,
          categoryId: food.id,
          type: "EXPENSE",
          amount: BigInt("100000"),
          transactionDate: new Date("2026-08-10T00:00:00.000Z"),
          clientRequestId: randomUUID(),
        },
        {
          ...ownerTransaction,
          categoryId: transport.id,
          type: "EXPENSE",
          amount: BigInt("200000"),
          transactionDate: new Date("2026-08-11T00:00:00.000Z"),
          clientRequestId: randomUUID(),
        },
        {
          ...ownerTransaction,
          categoryId: salary.id,
          type: "INCOME",
          amount: BigInt("500000"),
          transactionDate: new Date("2026-08-12T00:00:00.000Z"),
          clientRequestId: randomUUID(),
        },
        {
          ...ownerTransaction,
          categoryId: food.id,
          type: "EXPENSE",
          amount: BigInt("700000"),
          transactionDate: new Date("2026-07-15T00:00:00.000Z"),
          clientRequestId: randomUUID(),
        },
        {
          ...ownerTransaction,
          categoryId: food.id,
          type: "EXPENSE",
          amount: BigInt("900000"),
          transactionDate: new Date("2026-08-13T00:00:00.000Z"),
          clientRequestId: randomUUID(),
          deletedAt: now,
        },
        {
          userId: otherUser.id,
          accountId: otherAccount.id,
          categoryId: otherFood.id,
          type: "EXPENSE",
          amount: BigInt("999000"),
          description: "Other user fixture",
          transactionDate: new Date("2026-08-10T00:00:00.000Z"),
          transactionTime: null,
          clientRequestId: randomUUID(),
        },
      ],
    });

    await db.budget.createMany({
      data: [
        {
          userId: owner.id,
          categoryId: food.id,
          amount: BigInt("150000"),
          periodStart: new Date("2026-08-01T00:00:00.000Z"),
        },
        {
          userId: owner.id,
          categoryId: transport.id,
          amount: BigInt("250000"),
          periodStart: new Date("2026-08-01T00:00:00.000Z"),
        },
      ],
    });

    assert.deepEqual(
      await executeFinanceReadIntent(owner.id, { intent: "GET_BALANCE" }, now),
      {
        kind: "finance_answer",
        label: "Saldo tersedia",
        value: "Rp500.000",
        detail: "Dari 1 akun.",
      },
    );
    assert.equal(
      (
        await expectFinanceAnswer(executeFinanceReadIntent(
          owner.id,
          {
            intent: "GET_SPENDING_SUMMARY",
            transactionType: "EXPENSE",
            categoryHint: null,
            ranking: "NONE",
          },
          now,
        ))
      ).value,
      "Rp300.000",
    );
    assert.deepEqual(
      await executeFinanceReadIntent(
        owner.id,
        {
          intent: "GET_SPENDING_SUMMARY",
          transactionType: "EXPENSE",
          categoryHint: null,
          ranking: "TOP_CATEGORY",
        },
        now,
      ),
      {
        kind: "finance_answer",
        label: "Kategori pengeluaran terbesar",
        value: "Transport",
        detail: "Rp200.000 pada Agustus 2026.",
      },
    );
    assert.equal(
      (
        await expectFinanceAnswer(executeFinanceReadIntent(
          owner.id,
          {
            intent: "GET_SPENDING_SUMMARY",
            transactionType: "EXPENSE",
            categoryHint: "Food & Drink",
            ranking: "NONE",
          },
          now,
        ))
      ).value,
      "Rp100.000",
    );
    assert.deepEqual(
      await executeFinanceReadIntent(
        owner.id,
        { intent: "GET_BUDGET", categoryHint: "Food & Drink" },
        now,
      ),
      {
        kind: "finance_answer",
        label: "Sisa budget Food & Drink",
        value: "Rp50.000",
        detail: "Terpakai Rp100.000 dari Rp150.000.",
      },
    );
    assert.equal(
      (
        await expectFinanceAnswer(executeFinanceReadIntent(
          owner.id,
          { intent: "GET_BUDGET", categoryHint: null },
          now,
        ))
      ).value,
      "Rp100.000",
    );

    assert.equal(
      (
        await expectFinanceAnswer(executeFinanceReadIntent(
          otherUser.id,
          {
            intent: "GET_SPENDING_SUMMARY",
            transactionType: "EXPENSE",
            categoryHint: null,
            ranking: "NONE",
          },
          now,
        ))
      ).value,
      "Rp999.000",
    );
    assert.equal(
      (
        await expectFinanceAnswer(executeFinanceReadIntent(
          exactUser.id,
          { intent: "GET_BALANCE" },
          now,
        ))
      ).value,
      "Rp9.007.199.254.740.993",
    );
    assert.equal(
      (
        await expectFinanceAnswer(executeFinanceReadIntent(
          exactUser.id,
          { intent: "GET_BUDGET", categoryHint: null },
          now,
        ))
      ).value,
      "Belum ada budget",
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

checkAiFinanceTools()
  .then(() => {
    console.info("AI finance read tools verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("AI finance read tools verification failed.");
    console.error(error);
    process.exitCode = 1;
  });

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { db } from "../src/server/db/client";

async function verifyExactMoneyAndOwnership() {
  const openingBalance = BigInt("9007199254740993");
  let userId: string | undefined;

  try {
    const user = await db.user.create({
      data: {
        email: `schema-check-${randomUUID()}@example.test`,
        name: "Schema Check",
      },
    });
    userId = user.id;

    const account = await db.account.create({
      data: {
        userId,
        name: "Migration check account",
        type: "E_WALLET",
        openingBalance,
      },
    });
    const category = await db.category.create({
      data: {
        userId,
        name: "Food & Drink",
        type: "EXPENSE",
      },
    });

    assert.equal(account.userId, userId);
    assert.equal(account.openingBalance, openingBalance);
    assert.ok(account.openingBalanceAt instanceof Date);
    assert.equal(category.userId, userId);
  } finally {
    if (userId) {
      await db.category.deleteMany({ where: { userId } });
      await db.account.deleteMany({ where: { userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
  }
}

async function verifyNegativeOpeningBalanceIsRejected() {
  let userId: string | undefined;
  let rejected = false;

  try {
    const user = await db.user.create({
      data: {
        email: `schema-check-${randomUUID()}@example.test`,
        name: "Schema Check",
      },
    });
    userId = user.id;

    try {
      await db.account.create({
        data: {
          userId,
          name: "Invalid migration check account",
          type: "CASH",
          openingBalance: BigInt("-1"),
        },
      });
    } catch (error) {
      assert.match(String(error), /Account_openingBalance_nonnegative/);
      rejected = true;
    }
  } finally {
    if (userId) {
      await db.account.deleteMany({ where: { userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
  }

  assert.equal(rejected, true, "Database accepted a negative opening balance.");
}

async function checkOnboardingSchema() {
  await verifyExactMoneyAndOwnership();
  await verifyNegativeOpeningBalanceIsRejected();
}

checkOnboardingSchema()
  .then(() => {
    console.info("Onboarding schema verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch(() => {
    console.error("Onboarding schema verification failed.");
    process.exitCode = 1;
  });

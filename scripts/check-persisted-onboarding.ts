import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/server/db/client";
import {
  DEFAULT_CATEGORIES,
  initializeOnboarding,
} from "../src/server/onboarding/service";

async function checkPersistedOnboarding() {
  const userIds: string[] = [];

  try {
    const user = await db.user.create({
      data: {
        email: `persisted-onboarding-${randomUUID()}@example.test`,
        name: "Persisted Onboarding",
      },
    });
    userIds.push(user.id);

    const attempts = await Promise.all([
      initializeOnboarding(user.id, {
        accountName: "BCA Utama",
        accountType: "BANK",
        currentBalance: BigInt("4250000"),
      }),
      initializeOnboarding(user.id, {
        accountName: "BCA Utama",
        accountType: "BANK",
        currentBalance: BigInt("4250000"),
      }),
    ]);

    assert.equal(
      attempts.filter((attempt) => attempt.status === "created").length,
      1,
    );
    assert.equal(
      attempts.filter((attempt) => attempt.status === "already_initialized")
        .length,
      1,
    );

    const accounts = await db.account.findMany({ where: { userId: user.id } });
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0]?.name, "BCA Utama");
    assert.equal(accounts[0]?.type, "BANK");
    assert.equal(accounts[0]?.openingBalance, BigInt("4250000"));

    const categories = await db.category.findMany({
      where: { userId: user.id },
      select: { name: true, type: true },
    });
    const sortCategories = <T extends { name: string; type: string }>(
      values: readonly T[],
    ) =>
      [...values].sort((left, right) =>
        `${left.type}:${left.name}`.localeCompare(`${right.type}:${right.name}`),
      );
    assert.deepEqual(
      sortCategories(categories),
      sortCategories(DEFAULT_CATEGORIES),
    );

    const secondUser = await db.user.create({
      data: {
        email: `persisted-onboarding-${randomUUID()}@example.test`,
        name: "Second User",
      },
    });
    userIds.push(secondUser.id);

    const secondResult = await initializeOnboarding(secondUser.id, {
      accountName: "GoPay",
      accountType: "EWALLET",
      currentBalance: BigInt("75000"),
    });
    assert.equal(secondResult.status, "created");

    const secondAccount = await db.account.findFirstOrThrow({
      where: { userId: secondUser.id },
    });
    assert.equal(secondAccount.type, "E_WALLET");
    assert.equal(
      await db.category.count({ where: { userId: secondUser.id } }),
      DEFAULT_CATEGORIES.length,
    );
  } finally {
    if (userIds.length > 0) {
      await db.category.deleteMany({ where: { userId: { in: userIds } } });
      await db.account.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }
}

checkPersistedOnboarding()
  .then(() => {
    console.info("Persisted onboarding verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("Persisted onboarding verification failed.");
    console.error(error);
    process.exitCode = 1;
  });

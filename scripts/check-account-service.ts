import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { db } from "../src/server/db/client";
import {
  AccountNameConflictError,
  AccountNotFoundError,
  renameAccount,
} from "../src/server/accounts/service";

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

async function checkAccountService() {
  const userIds: string[] = [];

  try {
    const owner = await db.user.create({
      data: {
        email: `account-service-${randomUUID()}@example.test`,
        name: "Account Service Owner",
      },
    });
    const otherUser = await db.user.create({
      data: {
        email: `account-service-${randomUUID()}@example.test`,
        name: "Other Account Service Owner",
      },
    });
    userIds.push(owner.id, otherUser.id);

    const [primaryAccount, secondAccount, thirdAccount, otherAccount] =
      await Promise.all([
        db.account.create({
          data: {
            userId: owner.id,
            name: "BCA",
            type: "BANK",
            openingBalance: BigInt("100000"),
          },
        }),
        db.account.create({
          data: {
            userId: owner.id,
            name: "GoPay",
            type: "E_WALLET",
            openingBalance: BigInt("50000"),
          },
        }),
        db.account.create({
          data: {
            userId: owner.id,
            name: "Cash",
            type: "CASH",
            openingBalance: BigInt("25000"),
          },
        }),
        db.account.create({
          data: {
            userId: otherUser.id,
            name: "BCA",
            type: "BANK",
            openingBalance: BigInt("900000"),
          },
        }),
      ]);
    const category = await db.category.create({
      data: { userId: owner.id, name: "Food & Drink", type: "EXPENSE" },
    });
    const transaction = await db.transaction.create({
      data: {
        userId: owner.id,
        accountId: primaryAccount.id,
        categoryId: category.id,
        type: "EXPENSE",
        amount: BigInt("25000"),
        description: "Makan siang",
        transactionDate: new Date("2026-08-31T00:00:00.000Z"),
        clientRequestId: randomUUID(),
      },
    });

    const renamed = await renameAccount(owner.id, primaryAccount.id, {
      name: "Dana utama",
    });
    assert.equal(renamed.id, primaryAccount.id);
    assert.equal(renamed.name, "Dana utama");

    const persisted = await db.account.findUniqueOrThrow({
      where: { id: primaryAccount.id },
    });
    assert.equal(persisted.name, "Dana utama");
    assert.equal(persisted.openingBalance, BigInt("100000"));
    assert.equal(
      (
        await db.transaction.findUniqueOrThrow({ where: { id: transaction.id } })
      ).accountId,
      primaryAccount.id,
    );

    await expectError(
      () => renameAccount(otherUser.id, primaryAccount.id, { name: "Dicuri" }),
      AccountNotFoundError,
    );
    assert.equal(
      (await db.account.findUniqueOrThrow({ where: { id: primaryAccount.id } }))
        .name,
      "Dana utama",
    );
    assert.equal(
      (await db.account.findUniqueOrThrow({ where: { id: otherAccount.id } })).name,
      "BCA",
    );

    await expectError(
      () => renameAccount(owner.id, primaryAccount.id, { name: "gOpAy" }),
      AccountNameConflictError,
    );
    const recased = await renameAccount(owner.id, primaryAccount.id, {
      name: "DANA UTAMA",
    });
    assert.equal(recased.name, "DANA UTAMA");

    const concurrent = await Promise.allSettled([
      renameAccount(owner.id, secondAccount.id, { name: "Dompet utama" }),
      renameAccount(owner.id, thirdAccount.id, { name: "DOMPET UTAMA" }),
    ]);
    assert.equal(
      concurrent.filter(({ status }) => status === "fulfilled").length,
      1,
    );
    assert.equal(
      concurrent.filter(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof AccountNameConflictError,
      ).length,
      1,
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

checkAccountService()
  .then(() => {
    console.info("Account service verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("Account service verification failed.");
    console.error(error);
    process.exitCode = 1;
  });

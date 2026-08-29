import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import type { ApiSuccessResponse } from "../src/lib/api";
import type {
  FinanceSnapshotDto,
  TransactionDto,
  TransactionPageDto,
} from "../src/lib/transactions";
import { db } from "../src/server/db/client";
import { initializeOnboarding } from "../src/server/onboarding/service";

const baseUrl = process.env.FINARA_TEST_BASE_URL ?? "http://localhost:3000";

async function request(path: string, init?: RequestInit) {
  return fetch(new URL(path, baseUrl), {
    redirect: "manual",
    ...init,
  });
}

function sessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Sign-in response did not set a session cookie.");
  return setCookie.split(";", 1)[0];
}

async function registerAndSignIn(name: string) {
  const email = `runtime-transaction-${randomUUID()}@example.test`;
  const password = `Runtime-${randomUUID()}!`;
  const registration = await request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ name, email, password }),
  });
  assert.equal(registration.status, 200);

  const user = await db.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  const signIn = await request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(signIn.status, 200);

  return { userId: user.id, cookie: sessionCookie(signIn) };
}

async function apiData<T>(response: Response) {
  const body = (await response.json()) as ApiSuccessResponse<T>;
  return body.data;
}

async function checkTransactionApiFlow() {
  const userIds: string[] = [];

  try {
    assert.equal((await request("/api/transactions")).status, 401);
    assert.equal((await request("/api/finance/snapshot")).status, 401);

    const owner = await registerAndSignIn("Runtime Transaction Owner");
    const otherUser = await registerAndSignIn("Other Runtime Owner");
    userIds.push(owner.userId, otherUser.userId);

    await initializeOnboarding(owner.userId, {
      accountName: "Runtime Bank",
      accountType: "BANK",
      currentBalance: BigInt("321000"),
    });

    const snapshotResponse = await request(
      "/api/finance/snapshot?month=2026-08",
      { headers: { cookie: owner.cookie } },
    );
    assert.equal(snapshotResponse.status, 200);
    assert.equal(snapshotResponse.headers.get("cache-control"), "private, no-store");
    const snapshot = await apiData<FinanceSnapshotDto>(snapshotResponse);
    const account = snapshot.accounts[0];
    const category = snapshot.categories.find(
      (item) => item.type === "EXPENSE" && item.name === "Food & Drink",
    );
    assert.ok(account);
    assert.ok(category);
    assert.equal(snapshot.availableBalance, "321000");
    assert.equal(snapshot.monthlyIncome, "0");

    const crossOriginMutation = await request("/api/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
        origin: "https://attacker.example",
      },
      body: "{}",
    });
    assert.equal(crossOriginMutation.status, 403);

    const unsupportedMediaType = await request("/api/transactions", {
      method: "POST",
      headers: { cookie: owner.cookie },
      body: "{}",
    });
    assert.equal(unsupportedMediaType.status, 415);

    const malformedJson = await request("/api/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: "{",
    });
    assert.equal(malformedJson.status, 400);

    const oversizedJson = await request("/api/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify({ description: "a".repeat(17_000) }),
    });
    assert.equal(oversizedJson.status, 413);

    const invalidCreate = await request("/api/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify({ amount: "0" }),
    });
    assert.equal(invalidCreate.status, 422);

    const otherAccount = await db.account.create({
      data: {
        userId: otherUser.userId,
        name: "Other account",
        type: "CASH",
        openingBalance: BigInt("0"),
      },
    });

    const createPayload = {
      accountId: account.id,
      categoryId: category.id,
      type: "EXPENSE",
      amount: "25000",
      description: "Makan ayam",
      transactionDate: "2026-08-28",
      transactionTime: "12:30",
      clientRequestId: randomUUID(),
    };
    const crossUserCreate = await request("/api/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify({
        ...createPayload,
        accountId: otherAccount.id,
        clientRequestId: randomUUID(),
      }),
    });
    assert.equal(crossUserCreate.status, 422);

    const incompatibleCategory = await request("/api/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify({
        ...createPayload,
        type: "INCOME",
        clientRequestId: randomUUID(),
      }),
    });
    assert.equal(incompatibleCategory.status, 422);

    const createResponse = await request("/api/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify(createPayload),
    });
    assert.equal(createResponse.status, 201);
    const created = await apiData<TransactionDto>(createResponse);

    for (const path of ["/", "/activity"]) {
      const pageResponse = await request(path, {
        headers: { cookie: owner.cookie },
      });
      assert.equal(pageResponse.status, 200);
      assert.match(await pageResponse.text(), /Makan ayam/);
    }

    const retryResponse = await request("/api/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify(createPayload),
    });
    assert.equal(retryResponse.status, 201);
    assert.equal((await apiData<TransactionDto>(retryResponse)).id, created.id);

    const conflictingRetry = await request("/api/transactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify({ ...createPayload, amount: "26000" }),
    });
    assert.equal(conflictingRetry.status, 409);

    assert.equal(
      (
        await request("/api/transactions?limit=51", {
          headers: { cookie: owner.cookie },
        })
      ).status,
      422,
    );

    const listResponse = await request(
      "/api/transactions?month=2026-08&search=ayam",
      { headers: { cookie: owner.cookie } },
    );
    assert.equal(listResponse.status, 200);
    const page = await apiData<TransactionPageDto>(listResponse);
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0]?.id, created.id);

    const hiddenDetail = await request(`/api/transactions/${created.id}`, {
      headers: { cookie: otherUser.cookie },
    });
    assert.equal(hiddenDetail.status, 404);
    assert.equal(
      (
        await request("/api/transactions/not-a-uuid", {
          headers: { cookie: owner.cookie },
        })
      ).status,
      404,
    );

    const hiddenUpdate = await request(`/api/transactions/${created.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: otherUser.cookie,
      },
      body: JSON.stringify({
        ...createPayload,
        clientRequestId: undefined,
      }),
    });
    assert.equal(hiddenUpdate.status, 404);

    const hiddenDelete = await request(`/api/transactions/${created.id}`, {
      method: "DELETE",
      headers: { cookie: otherUser.cookie },
    });
    assert.equal(hiddenDelete.status, 404);

    const updateResponse = await request(`/api/transactions/${created.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify({
        ...createPayload,
        amount: "30000",
        description: "Makan siang",
        transactionTime: null,
        clientRequestId: undefined,
      }),
    });
    assert.equal(updateResponse.status, 200);
    assert.equal((await apiData<TransactionDto>(updateResponse)).amount, "30000");

    const updatedHome = await request("/", {
      headers: { cookie: owner.cookie },
    });
    assert.equal(updatedHome.status, 200);
    assert.match(await updatedHome.text(), /Makan siang/);

    const changedSnapshot = await apiData<FinanceSnapshotDto>(
      await request("/api/finance/snapshot?month=2026-08", {
        headers: { cookie: owner.cookie },
      }),
    );
    assert.equal(changedSnapshot.availableBalance, "291000");
    assert.equal(changedSnapshot.monthlyExpense, "30000");
    assert.equal(changedSnapshot.monthlyIncome, "0");

    const deleteResponse = await request(`/api/transactions/${created.id}`, {
      method: "DELETE",
      headers: { cookie: owner.cookie },
    });
    assert.equal(deleteResponse.status, 204);
    assert.equal(
      (
        await request(`/api/transactions/${created.id}`, {
          headers: { cookie: owner.cookie },
        })
      ).status,
      404,
    );

    const restoredSnapshot = await apiData<FinanceSnapshotDto>(
      await request("/api/finance/snapshot?month=2026-08", {
        headers: { cookie: owner.cookie },
      }),
    );
    assert.equal(restoredSnapshot.availableBalance, "321000");
    assert.equal(restoredSnapshot.monthlyExpense, "0");
    assert.equal(restoredSnapshot.monthlyIncome, "0");

    const restoredHome = await request("/", {
      headers: { cookie: owner.cookie },
    });
    assert.equal(restoredHome.status, 200);
    assert.doesNotMatch(await restoredHome.text(), /Makan siang/);
  } finally {
    if (userIds.length > 0) {
      await db.transaction.deleteMany({ where: { userId: { in: userIds } } });
      await db.category.deleteMany({ where: { userId: { in: userIds } } });
      await db.account.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }
}

checkTransactionApiFlow()
  .then(() => {
    console.info("Transaction HTTP API flow verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("Transaction HTTP API flow failed.");
    console.error(error);
    process.exitCode = 1;
  });

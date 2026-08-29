import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import type { ApiSuccessResponse } from "../src/lib/api";
import type { BudgetDto, BudgetOverviewDto } from "../src/lib/budgets";
import { db } from "../src/server/db/client";
import { initializeOnboarding } from "../src/server/onboarding/service";

const baseUrl = process.env.FINARA_TEST_BASE_URL ?? "http://localhost:3000";

async function request(path: string, init?: RequestInit) {
  return fetch(new URL(path, baseUrl), { redirect: "manual", ...init });
}

function sessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Sign-in response did not set a session cookie.");
  return setCookie.split(";", 1)[0];
}

async function registerAndSignIn(name: string) {
  const email = `runtime-budget-${randomUUID()}@example.test`;
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

async function checkBudgetApiFlow() {
  const userIds: string[] = [];

  try {
    assert.equal((await request("/api/budgets?month=2026-08")).status, 401);

    const owner = await registerAndSignIn("Runtime Budget Owner");
    const otherUser = await registerAndSignIn("Other Runtime Budget Owner");
    userIds.push(owner.userId, otherUser.userId);

    await initializeOnboarding(owner.userId, {
      accountName: "Runtime Bank",
      accountType: "BANK",
      currentBalance: BigInt("500000"),
    });
    await initializeOnboarding(otherUser.userId, {
      accountName: "Other Bank",
      accountType: "BANK",
      currentBalance: BigInt("100000"),
    });

    const [account, expenseCategory, incomeCategory, otherCategory] =
      await Promise.all([
        db.account.findFirstOrThrow({ where: { userId: owner.userId } }),
        db.category.findFirstOrThrow({
          where: { userId: owner.userId, type: "EXPENSE" },
        }),
        db.category.findFirstOrThrow({
          where: { userId: owner.userId, type: "INCOME" },
        }),
        db.category.findFirstOrThrow({
          where: { userId: otherUser.userId, type: "EXPENSE" },
        }),
      ]);

    assert.equal(
      (
        await request("/api/budgets?month=2026-08&unexpected=true", {
          headers: { cookie: owner.cookie },
        })
      ).status,
      422,
    );

    const crossOriginMutation = await request("/api/budgets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
        origin: "https://attacker.example",
      },
      body: "{}",
    });
    assert.equal(crossOriginMutation.status, 403);

    const unsupportedMediaType = await request("/api/budgets", {
      method: "POST",
      headers: { cookie: owner.cookie },
      body: "{}",
    });
    assert.equal(unsupportedMediaType.status, 415);

    const invalidAmount = await request("/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: owner.cookie },
      body: JSON.stringify({
        amount: "0",
        categoryId: expenseCategory.id,
        month: "2026-08",
      }),
    });
    assert.equal(invalidAmount.status, 422);

    for (const categoryId of [otherCategory.id, incomeCategory.id]) {
      const invalidCategory = await request("/api/budgets", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: owner.cookie,
        },
        body: JSON.stringify({
          amount: "100000",
          categoryId,
          month: "2026-08",
        }),
      });
      assert.equal(invalidCategory.status, 422);
    }

    const createPayload = {
      amount: "100000",
      categoryId: expenseCategory.id,
      month: "2026-08",
    };
    const createResponse = await request("/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: owner.cookie },
      body: JSON.stringify(createPayload),
    });
    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.headers.get("cache-control"), "private, no-store");
    const created = await apiData<BudgetDto>(createResponse);

    const retryResponse = await request("/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: owner.cookie },
      body: JSON.stringify(createPayload),
    });
    assert.equal(retryResponse.status, 201);
    assert.equal((await apiData<BudgetDto>(retryResponse)).id, created.id);

    const conflictResponse = await request("/api/budgets", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: owner.cookie },
      body: JSON.stringify({ ...createPayload, amount: "120000" }),
    });
    assert.equal(conflictResponse.status, 409);

    await db.transaction.create({
      data: {
        userId: owner.userId,
        accountId: account.id,
        categoryId: expenseCategory.id,
        type: "EXPENSE",
        amount: BigInt("25000"),
        description: "Runtime budget expense",
        transactionDate: new Date("2026-08-20T00:00:00.000Z"),
        transactionTime: null,
        clientRequestId: randomUUID(),
      },
    });

    const overviewResponse = await request("/api/budgets?month=2026-08", {
      headers: { cookie: owner.cookie },
    });
    assert.equal(overviewResponse.status, 200);
    const overview = await apiData<BudgetOverviewDto>(overviewResponse);
    assert.equal(overview.allocatedAmount, "100000");
    assert.equal(overview.spentAmount, "25000");
    assert.equal(overview.remainingAmount, "75000");
    assert.equal(overview.budgets[0]?.id, created.id);

    assert.equal(
      (
        await request(`/api/budgets/${created.id}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            cookie: otherUser.cookie,
          },
          body: JSON.stringify({ amount: "90000" }),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request("/api/budgets/not-a-uuid", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            cookie: owner.cookie,
          },
          body: JSON.stringify({ amount: "90000" }),
        })
      ).status,
      404,
    );

    const updateResponse = await request(`/api/budgets/${created.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: owner.cookie,
      },
      body: JSON.stringify({ amount: "90000" }),
    });
    assert.equal(updateResponse.status, 200);
    assert.equal((await apiData<BudgetDto>(updateResponse)).amount, "90000");

    const otherOverview = await apiData<BudgetOverviewDto>(
      await request("/api/budgets?month=2026-08", {
        headers: { cookie: otherUser.cookie },
      }),
    );
    assert.equal(otherOverview.budgets.length, 0);
  } finally {
    if (userIds.length > 0) {
      await db.budget.deleteMany({ where: { userId: { in: userIds } } });
      await db.transaction.deleteMany({ where: { userId: { in: userIds } } });
      await db.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await db.authIdentity.deleteMany({ where: { userId: { in: userIds } } });
      await db.category.deleteMany({ where: { userId: { in: userIds } } });
      await db.account.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }
}

checkBudgetApiFlow()
  .then(() => {
    console.info("Budget HTTP API flow verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("Budget HTTP API flow failed.");
    console.error(error);
    process.exitCode = 1;
  });

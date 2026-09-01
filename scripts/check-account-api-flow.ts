import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import type { AccountRenameDto } from "../src/lib/accounts";
import type { ApiSuccessResponse } from "../src/lib/api";
import type { TransactionDto } from "../src/lib/transactions";
import { db } from "../src/server/db/client";
import { initializeOnboarding } from "../src/server/onboarding/service";

const baseUrl = process.env.FINARA_TEST_BASE_URL ?? "http://localhost:3000";
const localRuntimeRateLimitKeys = [
  "0000:0000:0000:0000:0000:0000:0000:0000|/sign-up/email",
  "0000:0000:0000:0000:0000:0000:0000:0000|/sign-in/email",
];

async function resetLocalRuntimeRateLimits() {
  if (new URL(baseUrl).hostname !== "localhost") return;
  await db.authRateLimit.deleteMany({
    where: { key: { in: localRuntimeRateLimitKeys } },
  });
}

function request(path: string, init?: RequestInit) {
  return fetch(new URL(path, baseUrl), { redirect: "manual", ...init });
}

function accountRequest(
  cookie: string,
  accountId: string,
  body: BodyInit,
  origin = baseUrl,
  contentType = "application/json",
) {
  return request(`/api/accounts/${accountId}`, {
    method: "PATCH",
    headers: { "content-type": contentType, cookie, origin },
    body,
  });
}

function sessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Sign-in response did not set a session cookie.");
  return setCookie.split(";", 1)[0];
}

async function registerAndSignIn(name: string) {
  const email = `runtime-account-${randomUUID()}@example.test`;
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
  return ((await response.json()) as ApiSuccessResponse<T>).data;
}

async function checkAccountApiFlow() {
  const userIds: string[] = [];

  try {
    await resetLocalRuntimeRateLimits();
    const unknownId = randomUUID();
    assert.equal(
      (await accountRequest("", unknownId, JSON.stringify({ name: "Baru" })))
        .status,
      401,
    );
    const signedOutPrivacy = await request("/profile/privacy");
    assert.equal(signedOutPrivacy.status, 307);
    assert.equal(signedOutPrivacy.headers.get("location"), "/welcome");

    const owner = await registerAndSignIn("Runtime Account Owner");
    const otherUser = await registerAndSignIn("Other Runtime Account Owner");
    userIds.push(owner.userId, otherUser.userId);
    await initializeOnboarding(owner.userId, {
      accountName: "Runtime Bank Lama",
      accountType: "BANK",
      currentBalance: BigInt("500000"),
    });
    await initializeOnboarding(otherUser.userId, {
      accountName: "Other Runtime Bank",
      accountType: "BANK",
      currentBalance: BigInt("100000"),
    });

    const [account, otherAccount, expenseCategory] = await Promise.all([
      db.account.findFirstOrThrow({ where: { userId: owner.userId } }),
      db.account.findFirstOrThrow({ where: { userId: otherUser.userId } }),
      db.category.findFirstOrThrow({
        where: { userId: owner.userId, type: "EXPENSE" },
      }),
    ]);
    await db.account.create({
      data: {
        userId: owner.userId,
        name: "GoPay",
        type: "E_WALLET",
        openingBalance: BigInt("50000"),
      },
    });
    const transaction = await db.transaction.create({
      data: {
        userId: owner.userId,
        accountId: account.id,
        categoryId: expenseCategory.id,
        type: "EXPENSE",
        amount: BigInt("25000"),
        description: "Runtime account rename transaction",
        transactionDate: new Date("2026-08-31T00:00:00.000Z"),
        clientRequestId: randomUUID(),
      },
    });

    assert.equal(
      (
        await accountRequest(
          owner.cookie,
          account.id,
          JSON.stringify({ name: "Baru" }),
          "https://attacker.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await accountRequest(
          owner.cookie,
          account.id,
          JSON.stringify({ name: "Baru" }),
          baseUrl,
          "text/plain",
        )
      ).status,
      415,
    );
    assert.equal(
      (await accountRequest(owner.cookie, "invalid-id", "{}")).status,
      404,
    );
    assert.equal(
      (await accountRequest(owner.cookie, account.id, "{")).status,
      400,
    );
    assert.equal(
      (
        await accountRequest(
          owner.cookie,
          account.id,
          JSON.stringify({ name: "a".repeat(17_000) }),
        )
      ).status,
      413,
    );
    for (const body of [
      { name: " " },
      { name: "Baru", userId: otherUser.userId },
    ]) {
      assert.equal(
        (await accountRequest(owner.cookie, account.id, JSON.stringify(body)))
          .status,
        422,
      );
    }
    assert.equal(
      (
        await accountRequest(
          owner.cookie,
          account.id,
          JSON.stringify({ name: "gopay" }),
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await accountRequest(
          owner.cookie,
          otherAccount.id,
          JSON.stringify({ name: "Tidak boleh" }),
        )
      ).status,
      404,
    );

    const response = await accountRequest(
      owner.cookie,
      account.id,
      JSON.stringify({ name: "  Runtime Dana Utama  " }),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const renamed = await apiData<AccountRenameDto>(response);
    assert.equal(renamed.id, account.id);
    assert.equal(renamed.name, "Runtime Dana Utama");
    assert.match(renamed.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

    const persisted = await db.account.findUniqueOrThrow({
      where: { id: account.id },
    });
    assert.equal(persisted.name, "Runtime Dana Utama");
    const transactionDetail = await apiData<TransactionDto>(
      await request(`/api/transactions/${transaction.id}`, {
        headers: { cookie: owner.cookie },
      }),
    );
    assert.equal(transactionDetail.accountName, "Runtime Dana Utama");

    const financeSettings = await request("/profile/finance", {
      headers: { cookie: owner.cookie },
    });
    assert.equal(financeSettings.status, 200);
    assert.match(await financeSettings.text(), /Runtime Dana Utama/);

    const profile = await request("/profile", {
      headers: { cookie: owner.cookie },
    });
    assert.equal(profile.status, 200);
    const profileHtml = await profile.text();
    assert.match(profileHtml, /href="\/profile\/privacy"/);
    assert.doesNotMatch(profileHtml, /sesi browser/i);

    const privacy = await request("/profile/privacy", {
      headers: { cookie: owner.cookie },
    });
    assert.equal(privacy.status, 200);
    const privacyHtml = await privacy.text();
    assert.match(privacyHtml, /Data &amp; privasi/);
    assert.match(privacyHtml, /Hanya konteks yang diperlukan/);
    assert.match(privacyHtml, /Konfirmasi sebelum menyimpan/);
    assert.equal(
      (await request(`/api/accounts/${account.id}`)).status,
      405,
    );
  } finally {
    if (userIds.length > 0) {
      await db.transaction.deleteMany({ where: { userId: { in: userIds } } });
      await db.authSession.deleteMany({ where: { userId: { in: userIds } } });
      await db.authIdentity.deleteMany({ where: { userId: { in: userIds } } });
      await db.category.deleteMany({ where: { userId: { in: userIds } } });
      await db.account.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await resetLocalRuntimeRateLimits();
  }
}

checkAccountApiFlow()
  .then(() => {
    console.info("Account production HTTP flow verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("Account production HTTP flow failed.");
    console.error(error);
    process.exitCode = 1;
  });

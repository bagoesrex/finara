import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ApiSuccessResponse } from "../src/lib/api";
import type { AiComposerResponse } from "../src/lib/ai-composer";
import { getAiPreviewRateLimitConfig } from "../src/server/ai/rate-limit-policy";
import { db } from "../src/server/db/client";
import { initializeOnboarding } from "../src/server/onboarding/service";

const baseUrl = process.env.FINARA_TEST_BASE_URL ?? "http://localhost:3000";
const localRuntimeRateLimitKeys = [
  "0000:0000:0000:0000:0000:0000:0000:0000|/sign-up/email",
  "0000:0000:0000:0000:0000:0000:0000:0000|/sign-in/email",
];

async function resetLocalAuthRateLimits() {
  if (new URL(baseUrl).hostname !== "localhost") return;
  await db.authRateLimit.deleteMany({
    where: { key: { in: localRuntimeRateLimitKeys } },
  });
}

function request(path: string, init?: RequestInit) {
  return fetch(new URL(path, baseUrl), { redirect: "manual", ...init });
}

function composerRequest(cookie: string, body: unknown, origin = baseUrl) {
  return request("/api/ai/composer-responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      origin,
    },
    body: JSON.stringify(body),
  });
}

function sessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Sign-in response did not set a session cookie.");
  return setCookie.split(";", 1)[0];
}

async function checkAiComposerApiFlow() {
  const email = `runtime-ai-composer-${randomUUID()}@example.test`;
  const password = `Runtime-${randomUUID()}!`;
  let userId: string | undefined;

  try {
    await resetLocalAuthRateLimits();

    const unauthorized = await composerRequest("", { text: "saldo saya?" });
    assert.equal(unauthorized.status, 401);

    const registration = await request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ name: "Runtime AI Composer", email, password }),
    });
    assert.equal(registration.status, 200);

    const user = await db.user.findUniqueOrThrow({
      where: { email },
      select: { id: true },
    });
    userId = user.id;
    await initializeOnboarding(userId, {
      accountName: "Runtime Bank",
      accountType: "BANK",
      currentBalance: BigInt("500000"),
    });

    const signIn = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(signIn.status, 200);
    const cookie = sessionCookie(signIn);

    const home = await request("/", { headers: { cookie } });
    assert.equal(home.status, 200);
    const homeHtml = await home.text();
    assert.match(homeHtml, /Catat atau tanya/);
    assert.match(homeHtml, /Sisa budget makan\?/);

    const crossOrigin = await composerRequest(
      cookie,
      { text: "saldo saya?" },
      "https://attacker.example",
    );
    assert.equal(crossOrigin.status, 403);

    const forgedIdentity = await composerRequest(cookie, {
      text: "saldo saya?",
      userId: randomUUID(),
    });
    assert.equal(forgedIdentity.status, 422);

    const answerResponse = await composerRequest(cookie, {
      text: "saldo saya?",
    });
    assert.equal(answerResponse.status, 200);
    const answerBody =
      (await answerResponse.json()) as ApiSuccessResponse<AiComposerResponse>;
    assert.deepEqual(answerBody.data, {
      kind: "finance_answer",
      label: "Saldo tersedia",
      value: "Rp500.000",
      detail: "Dari 1 akun.",
    });
    assert.equal(
      await db.transaction.count({ where: { userId } }),
      0,
      "A financial question must not create a transaction.",
    );

    const policy = getAiPreviewRateLimitConfig();
    await db.aiRateLimit.update({
      where: { userId },
      data: { requestCount: policy.maxRequests, windowStartedAt: new Date() },
    });
    const limited = await composerRequest(cookie, { text: "saldo saya?" });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("retry-after")) > 0);
    assert.equal(limited.headers.get("cache-control"), "private, no-store");
  } finally {
    if (userId) {
      await db.aiRateLimit.deleteMany({ where: { userId } });
      await db.transaction.deleteMany({ where: { userId } });
      await db.budget.deleteMany({ where: { userId } });
      await db.category.deleteMany({ where: { userId } });
      await db.account.deleteMany({ where: { userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
    await resetLocalAuthRateLimits();
  }
}

checkAiComposerApiFlow()
  .then(() => {
    console.info("AI composer production HTTP flow verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("AI composer production HTTP flow failed.");
    console.error(error);
    process.exitCode = 1;
  });

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "dotenv/config";

import { db } from "../src/server/db/client";
import {
  AiPreviewRateLimitExceededError,
  consumeAiPreviewQuota,
} from "../src/server/ai/rate-limit";

const policy = { maxRequests: 3, windowMs: 60_000 };
const windowStartedAt = new Date("2026-08-30T10:00:00.000Z");

async function expectRateLimit(userId: string) {
  let caught: unknown;

  try {
    await consumeAiPreviewQuota(userId, { now: windowStartedAt, policy });
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof AiPreviewRateLimitExceededError);
  assert.equal(caught.retryAfterSeconds, 60);
}

async function checkAiRateLimit() {
  const userIds: string[] = [];

  try {
    const sequentialUser = await db.user.create({
      data: {
        email: `ai-rate-limit-${randomUUID()}@example.test`,
        name: "AI Rate Limit Sequential",
      },
    });
    userIds.push(sequentialUser.id);
    const concurrentUser = await db.user.create({
      data: {
        email: `ai-rate-limit-${randomUUID()}@example.test`,
        name: "AI Rate Limit Concurrent",
      },
    });
    userIds.push(concurrentUser.id);

    for (let request = 0; request < policy.maxRequests; request += 1) {
      await consumeAiPreviewQuota(sequentialUser.id, {
        now: windowStartedAt,
        policy,
      });
    }
    await expectRateLimit(sequentialUser.id);

    const sequentialState = await db.aiRateLimit.findUniqueOrThrow({
      where: { userId: sequentialUser.id },
    });
    assert.equal(sequentialState.requestCount, policy.maxRequests);

    await consumeAiPreviewQuota(sequentialUser.id, {
      now: new Date(windowStartedAt.getTime() + policy.windowMs + 1),
      policy,
    });
    const resetState = await db.aiRateLimit.findUniqueOrThrow({
      where: { userId: sequentialUser.id },
    });
    assert.equal(resetState.requestCount, 1);

    const concurrentResults = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        consumeAiPreviewQuota(concurrentUser.id, {
          now: windowStartedAt,
          policy,
        }),
      ),
    );
    assert.equal(
      concurrentResults.filter((result) => result.status === "fulfilled")
        .length,
      policy.maxRequests,
    );
    assert.ok(
      concurrentResults
        .filter((result) => result.status === "rejected")
        .every(
          (result) =>
            result.reason instanceof AiPreviewRateLimitExceededError,
        ),
    );

    const concurrentState = await db.aiRateLimit.findUniqueOrThrow({
      where: { userId: concurrentUser.id },
    });
    assert.equal(concurrentState.requestCount, policy.maxRequests);
  } finally {
    if (userIds.length > 0) {
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      assert.equal(
        await db.aiRateLimit.count({ where: { userId: { in: userIds } } }),
        0,
      );
    }
  }
}

checkAiRateLimit()
  .then(() => {
    console.info("AI preview rate limit verified.");
  })
  .finally(async () => {
    await db.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("AI preview rate limit verification failed.");
    console.error(error);
    process.exitCode = 1;
  });

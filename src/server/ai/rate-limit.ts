import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import {
  getAiPreviewRateLimitConfig,
  getRetryAfterSeconds,
} from "./rate-limit-policy";

type AiPreviewRateLimitPolicy = {
  maxRequests: number;
  windowMs: number;
};

type ConsumeAiPreviewQuotaOptions = {
  now?: Date;
  policy?: AiPreviewRateLimitPolicy;
};

export class AiPreviewRateLimitExceededError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("AI preview request rate exceeded.");
    this.name = "AiPreviewRateLimitExceededError";
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function consumeAiPreviewQuota(
  userId: string,
  options: ConsumeAiPreviewQuotaOptions = {},
) {
  const now = options.now ?? new Date();
  const policy = options.policy ?? getAiPreviewRateLimitConfig();
  const windowCutoff = new Date(now.getTime() - policy.windowMs);

  const reset = await db.aiRateLimit.updateMany({
    where: { userId, windowStartedAt: { lte: windowCutoff } },
    data: { windowStartedAt: now, requestCount: 1 },
  });
  if (reset.count === 1) return;

  try {
    await db.aiRateLimit.create({
      data: { userId, windowStartedAt: now, requestCount: 1 },
    });
    return;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }

  const increment = await db.aiRateLimit.updateMany({
    where: {
      userId,
      windowStartedAt: { gt: windowCutoff },
      requestCount: { lt: policy.maxRequests },
    },
    data: { requestCount: { increment: 1 } },
  });
  if (increment.count === 1) return;

  const current = await db.aiRateLimit.findUnique({
    where: { userId },
    select: { windowStartedAt: true },
  });
  if (!current) {
    throw new Error("AI preview rate limit state is unavailable.");
  }

  throw new AiPreviewRateLimitExceededError(
    getRetryAfterSeconds(current.windowStartedAt, now, policy.windowMs),
  );
}

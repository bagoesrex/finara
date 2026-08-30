export const DEFAULT_AI_PREVIEW_RATE_LIMIT_MAX = 10;
export const DEFAULT_AI_PREVIEW_RATE_LIMIT_WINDOW_MS = 60_000;

const MAX_REQUESTS_RANGE = { min: 1, max: 100 };
const WINDOW_SECONDS_RANGE = { min: 10, max: 3_600 };

type AiRateLimitEnvironment = {
  AI_PREVIEW_RATE_LIMIT_MAX?: string;
  AI_PREVIEW_RATE_LIMIT_WINDOW_SECONDS?: string;
};

export class AiRateLimitConfigurationError extends Error {
  constructor() {
    super("AI preview rate limiting is misconfigured.");
    this.name = "AiRateLimitConfigurationError";
  }
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  range: { min: number; max: number },
) {
  if (value === undefined) return fallback;

  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new AiRateLimitConfigurationError();
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < range.min || parsed > range.max) {
    throw new AiRateLimitConfigurationError();
  }

  return parsed;
}

export function getAiPreviewRateLimitConfig(
  environment: AiRateLimitEnvironment = {
    AI_PREVIEW_RATE_LIMIT_MAX: process.env.AI_PREVIEW_RATE_LIMIT_MAX,
    AI_PREVIEW_RATE_LIMIT_WINDOW_SECONDS:
      process.env.AI_PREVIEW_RATE_LIMIT_WINDOW_SECONDS,
  },
) {
  const maxRequests = parseBoundedInteger(
    environment.AI_PREVIEW_RATE_LIMIT_MAX,
    DEFAULT_AI_PREVIEW_RATE_LIMIT_MAX,
    MAX_REQUESTS_RANGE,
  );
  const windowSeconds = parseBoundedInteger(
    environment.AI_PREVIEW_RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_AI_PREVIEW_RATE_LIMIT_WINDOW_MS / 1_000,
    WINDOW_SECONDS_RANGE,
  );

  return { maxRequests, windowMs: windowSeconds * 1_000 };
}

export function getRetryAfterSeconds(
  windowStartedAt: Date,
  now: Date,
  windowMs: number,
) {
  const remainingMs = windowStartedAt.getTime() + windowMs - now.getTime();
  return Math.max(1, Math.ceil(remainingMs / 1_000));
}

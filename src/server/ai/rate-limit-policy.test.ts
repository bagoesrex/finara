import { describe, expect, it } from "bun:test";

import {
  AiRateLimitConfigurationError,
  DEFAULT_AI_PREVIEW_RATE_LIMIT_MAX,
  DEFAULT_AI_PREVIEW_RATE_LIMIT_WINDOW_MS,
  getAiPreviewRateLimitConfig,
  getRetryAfterSeconds,
} from "./rate-limit-policy";

describe("AI preview rate-limit policy", () => {
  it("uses conservative defaults when no override is configured", () => {
    expect(getAiPreviewRateLimitConfig({})).toEqual({
      maxRequests: DEFAULT_AI_PREVIEW_RATE_LIMIT_MAX,
      windowMs: DEFAULT_AI_PREVIEW_RATE_LIMIT_WINDOW_MS,
    });
  });

  it("accepts bounded integer overrides", () => {
    expect(
      getAiPreviewRateLimitConfig({
        AI_PREVIEW_RATE_LIMIT_MAX: " 20 ",
        AI_PREVIEW_RATE_LIMIT_WINDOW_SECONDS: "120",
      }),
    ).toEqual({ maxRequests: 20, windowMs: 120_000 });
  });

  it("fails closed for malformed or unsafe overrides", () => {
    for (const environment of [
      { AI_PREVIEW_RATE_LIMIT_MAX: "0" },
      { AI_PREVIEW_RATE_LIMIT_MAX: "101" },
      { AI_PREVIEW_RATE_LIMIT_MAX: "1.5" },
      { AI_PREVIEW_RATE_LIMIT_WINDOW_SECONDS: "9" },
      { AI_PREVIEW_RATE_LIMIT_WINDOW_SECONDS: "3601" },
      { AI_PREVIEW_RATE_LIMIT_WINDOW_SECONDS: "" },
    ]) {
      expect(() => getAiPreviewRateLimitConfig(environment)).toThrow(
        AiRateLimitConfigurationError,
      );
    }
  });

  it("rounds Retry-After up and never returns less than one second", () => {
    const windowStartedAt = new Date("2026-08-30T10:00:00.000Z");

    expect(
      getRetryAfterSeconds(
        windowStartedAt,
        new Date("2026-08-30T10:00:59.001Z"),
        60_000,
      ),
    ).toBe(1);
    expect(
      getRetryAfterSeconds(
        windowStartedAt,
        new Date("2026-08-30T10:00:30.001Z"),
        60_000,
      ),
    ).toBe(30);
  });
});

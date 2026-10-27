import { describe, expect, it } from "bun:test";

import {
  AiConfigurationError,
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_NVIDIA_MODEL,
  getAiConfig,
  getNvidiaConfig,
  NvidiaConfigurationError,
} from "./config";

describe("AI server configuration", () => {
  it("uses documented default baseUrl and model with AI_API_KEY", () => {
    expect(getAiConfig({ AI_API_KEY: "  test-ai-key  " })).toEqual({
      apiKey: "test-ai-key",
      baseUrl: DEFAULT_AI_BASE_URL,
      model: DEFAULT_AI_MODEL,
    });
  });

  it("normalizes trailing slashes on custom AI_BASE_URL", () => {
    expect(
      getAiConfig({
        AI_API_KEY: "test-key",
        AI_BASE_URL: "https://api.9router.com/v1///",
        AI_MODEL: "google/gemini-2.5-flash",
      }),
    ).toEqual({
      apiKey: "test-key",
      baseUrl: "https://api.9router.com/v1",
      model: "google/gemini-2.5-flash",
    });
  });

  it("falls back to NVIDIA configuration when AI_API_KEY is unset", () => {
    expect(
      getAiConfig({
        NVIDIA_API_KEY: "nv-key",
        NVIDIA_MODEL: "nvidia/nemotron-model",
      }),
    ).toEqual({
      apiKey: "nv-key",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      model: "nvidia/nemotron-model",
    });
  });

  it("fails closed when neither AI_API_KEY nor NVIDIA_API_KEY is present", () => {
    expect(() => getAiConfig({})).toThrow(AiConfigurationError);
  });

  it("fails closed when AI_BASE_URL is invalid", () => {
    expect(() =>
      getAiConfig({
        AI_API_KEY: "key",
        AI_BASE_URL: "not-a-valid-url",
      }),
    ).toThrow(AiConfigurationError);
  });

  it("preserves backward-compatible getNvidiaConfig and NvidiaConfigurationError", () => {
    expect(getNvidiaConfig({ NVIDIA_API_KEY: "nv-key" })).toEqual({
      apiKey: "nv-key",
      model: DEFAULT_NVIDIA_MODEL,
    });
    expect(() => getNvidiaConfig({})).toThrow(NvidiaConfigurationError);
  });
});

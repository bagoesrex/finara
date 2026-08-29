import { describe, expect, it } from "vitest";

import {
  DEFAULT_NVIDIA_MODEL,
  getNvidiaConfig,
  NvidiaConfigurationError,
} from "./config";

describe("NVIDIA server configuration", () => {
  it("uses the documented default model while keeping it configurable", () => {
    expect(getNvidiaConfig({ NVIDIA_API_KEY: "  test-key  " })).toEqual({
      apiKey: "test-key",
      model: DEFAULT_NVIDIA_MODEL,
    });
  });

  it("accepts a valid model override", () => {
    expect(
      getNvidiaConfig({
        NVIDIA_API_KEY: "key",
        NVIDIA_MODEL: "meta/llama-model",
      }),
    ).toEqual({ apiKey: "key", model: "meta/llama-model" });
  });

  it("fails closed when the key or model configuration is invalid", () => {
    expect(() => getNvidiaConfig({})).toThrow(NvidiaConfigurationError);
    expect(() =>
      getNvidiaConfig({ NVIDIA_API_KEY: "key", NVIDIA_MODEL: "https://host" }),
    ).toThrow(NvidiaConfigurationError);
  });
});

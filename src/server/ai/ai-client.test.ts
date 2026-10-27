import { describe, expect, it, vi } from "bun:test";
import { z } from "zod";

import {
  AiInvalidResponseError,
  AiUnavailableError,
  requestAiStructuredJson,
  requestAiTransactionExtraction,
  resolveChatCompletionsUrl,
} from "./ai-client";

const extraction = {
  intent: "CREATE_TRANSACTION" as const,
  type: "EXPENSE" as const,
  amount: "25000",
  description: "Makan ayam",
  categoryHint: "Food & Drink",
  transactionDate: "2026-08-30",
  transactionTime: null,
  missingFields: [],
};

type FetchImplementation = (
  ...args: Parameters<typeof fetch>
) => ReturnType<typeof fetch>;

function completion(content: string) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("OpenAI-compatible AI client", () => {
  it("resolves chat completions URL from base URL properly", () => {
    expect(resolveChatCompletionsUrl("https://openrouter.ai/api/v1")).toBe(
      "https://openrouter.ai/api/v1/chat/completions",
    );
    expect(resolveChatCompletionsUrl("https://api.9router.com/v1/")).toBe(
      "https://api.9router.com/v1/chat/completions",
    );
  });

  it("validates a structured response with the caller schema", async () => {
    const intentSchema = z
      .object({ intent: z.literal("GET_BALANCE") })
      .strict();

    await expect(
      requestAiStructuredJson(
        {
          apiKey: "key",
          baseUrl: "https://api.9router.com/v1",
          maxTokens: 128,
          model: "google/gemini-2.5-flash",
          outputSchema: intentSchema,
          systemPrompt: "Select one intent.",
          userPrompt: "saldo saya?",
        },
        async () => completion(JSON.stringify({ intent: "GET_BALANCE" })),
      ),
    ).resolves.toEqual({ intent: "GET_BALANCE" });
  });

  it("handles JSON wrapped in markdown code blocks or reasoning tags", async () => {
    const intentSchema = z
      .object({ intent: z.literal("GET_BALANCE") })
      .strict();

    await expect(
      requestAiStructuredJson(
        {
          apiKey: "key",
          model: "provider/model",
          outputSchema: intentSchema,
          systemPrompt: "Select one intent.",
          userPrompt: "saldo saya?",
        },
        async () =>
          completion("<think>pondering...</think>\n```json\n" + JSON.stringify({ intent: "GET_BALANCE" }) + "\n```"),
      ),
    ).resolves.toEqual({ intent: "GET_BALANCE" });
  });

  it("rejects invalid tokens or schema mismatches", async () => {
    const intentSchema = z.object({ intent: z.literal("GET_BALANCE") });

    await expect(
      requestAiStructuredJson(
        {
          apiKey: "key",
          maxTokens: 1000,
          model: "provider/model",
          outputSchema: intentSchema,
          systemPrompt: "system",
          userPrompt: "user",
        },
        async () => completion(JSON.stringify({ intent: "GET_BALANCE" })),
      ),
    ).rejects.toBeInstanceOf(AiInvalidResponseError);
  });

  it("sends standard OpenAI-compatible payload to derived chat/completions endpoint", async () => {
    const fetchImpl = vi.fn<FetchImplementation>(async () =>
      completion(JSON.stringify(extraction)),
    );

    await expect(
      requestAiTransactionExtraction(
        {
          apiKey: "test-ai-key",
          baseUrl: "https://api.9router.com/v1",
          model: "meta-llama/llama-3.3-70b-instruct",
          systemPrompt: "Return transaction JSON only.",
          userPrompt: "makan ayam 25rb",
        },
        fetchImpl,
      ),
    ).resolves.toEqual(extraction);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.9router.com/v1/chat/completions");
    expect(init?.headers).toEqual({
      accept: "application/json",
      authorization: "Bearer test-ai-key",
      "content-type": "application/json",
    });

    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      chat_template_kwargs: { enable_thinking: false },
      max_tokens: 256,
      model: "meta-llama/llama-3.3-70b-instruct",
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0,
    });
  });

  it("turns upstream non-ok responses into AiUnavailableError", async () => {
    await expect(
      requestAiTransactionExtraction(
        {
          apiKey: "key",
          model: "provider/model",
          systemPrompt: "system",
          userPrompt: "input",
        },
        async () => new Response("Rate limit exceeded", { status: 429 }),
      ),
    ).rejects.toBeInstanceOf(AiUnavailableError);
  });
});

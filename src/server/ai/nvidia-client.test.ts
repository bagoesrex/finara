import { describe, expect, it, vi } from "bun:test";
import { z } from "zod";

import {
  NVIDIA_CHAT_COMPLETIONS_URL,
  NvidiaInvalidResponseError,
  NvidiaUnavailableError,
  requestNvidiaStructuredJson,
  requestNvidiaTransactionExtraction,
} from "./nvidia-client";

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

describe("NVIDIA transaction extraction client", () => {
  it("validates a generic structured response with the caller schema", async () => {
    const intentSchema = z
      .object({ intent: z.literal("GET_BALANCE") })
      .strict();

    await expect(
      requestNvidiaStructuredJson(
        {
          apiKey: "key",
          maxTokens: 128,
          model: "nvidia/model",
          outputSchema: intentSchema,
          systemPrompt: "Select one intent.",
          userPrompt: "saldo saya?",
        },
        async () => completion(JSON.stringify({ intent: "GET_BALANCE" })),
      ),
    ).resolves.toEqual({ intent: "GET_BALANCE" });

    await expect(
      requestNvidiaStructuredJson(
        {
          apiKey: "key",
          model: "nvidia/model",
          outputSchema: intentSchema,
          systemPrompt: "Select one intent.",
          userPrompt: "saldo saya?",
        },
        async () =>
          completion(
            JSON.stringify({ intent: "GET_BALANCE", userId: "forged" }),
          ),
      ),
    ).rejects.toBeInstanceOf(NvidiaInvalidResponseError);
  });

  it("rejects an unsafe structured-output token limit before provider access", async () => {
    const fetchImpl = vi.fn<FetchImplementation>();

    await expect(
      requestNvidiaStructuredJson(
        {
          apiKey: "key",
          maxTokens: 513,
          model: "nvidia/model",
          outputSchema: z.object({ intent: z.string() }),
          systemPrompt: "Select one intent.",
          userPrompt: "saldo saya?",
        },
        fetchImpl,
      ),
    ).rejects.toBeInstanceOf(NvidiaInvalidResponseError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends one bounded, non-streaming JSON request and validates the result", async () => {
    const fetchImpl = vi.fn<FetchImplementation>(async () =>
      completion(JSON.stringify(extraction)),
    );

    await expect(
      requestNvidiaTransactionExtraction(
        {
          apiKey: "test-key",
          model: "nvidia/nemotron-3.5-lightning-30b-a3b",
          systemPrompt: "Return transaction JSON only.",
          userPrompt: "makan ayam 25rb",
        },
        fetchImpl,
      ),
    ).resolves.toEqual(extraction);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(NVIDIA_CHAT_COMPLETIONS_URL);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      accept: "application/json",
      authorization: "Bearer test-key",
      "content-type": "application/json",
    });

    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      chat_template_kwargs: { enable_thinking: false },
      max_tokens: 256,
      model: "nvidia/nemotron-3.5-lightning-30b-a3b",
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0,
    });
    expect(body.messages).toEqual([
      { role: "system", content: "Return transaction JSON only." },
      { role: "user", content: "makan ayam 25rb" },
    ]);
    expect(String(init?.body)).not.toContain("test-key");
  });

  it("rejects malformed or schema-invalid provider output", async () => {
    await expect(
      requestNvidiaTransactionExtraction(
        {
          apiKey: "key",
          model: "nvidia/model",
          systemPrompt: "system",
          userPrompt: "input",
        },
        async () => completion("not json"),
      ),
    ).rejects.toBeInstanceOf(NvidiaInvalidResponseError);

    await expect(
      requestNvidiaTransactionExtraction(
        {
          apiKey: "key",
          model: "nvidia/model",
          systemPrompt: "system",
          userPrompt: "input",
        },
        async () => completion(JSON.stringify({ ...extraction, amount: "25rb" })),
      ),
    ).rejects.toBeInstanceOf(NvidiaInvalidResponseError);
  });

  it("turns upstream failures into a generic unavailable error", async () => {
    await expect(
      requestNvidiaTransactionExtraction(
        {
          apiKey: "key",
          model: "nvidia/model",
          systemPrompt: "system",
          userPrompt: "input",
        },
        async () => new Response("provider internals", { status: 429 }),
      ),
    ).rejects.toBeInstanceOf(NvidiaUnavailableError);
  });
});

import { describe, expect, it, vi } from "vitest";

import {
  NVIDIA_CHAT_COMPLETIONS_URL,
  NvidiaInvalidResponseError,
  NvidiaUnavailableError,
  requestNvidiaTransactionExtraction,
} from "./nvidia-client";

const extraction = {
  intent: "CREATE_TRANSACTION",
  type: "EXPENSE",
  amount: "25000",
  description: "Makan ayam",
  categoryHint: "Food & Drink",
  transactionDate: "2026-08-30",
  transactionTime: null,
  missingFields: [],
};

function completion(content: string) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("NVIDIA transaction extraction client", () => {
  it("sends one bounded, non-streaming JSON request and validates the result", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
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

import { z } from "zod";

import { aiTransactionExtractionSchema } from "../../lib/ai-transaction";

export const NVIDIA_CHAT_COMPLETIONS_URL =
  "https://integrate.api.nvidia.com/v1/chat/completions";

const NVIDIA_REQUEST_TIMEOUT_MS = 8_000;
const MAX_NVIDIA_RESPONSE_BYTES = 65_536;

const nvidiaCompletionSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({ content: z.string() })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

type NvidiaTransactionRequest = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
};

export class NvidiaUnavailableError extends Error {
  constructor() {
    super("NVIDIA inference is unavailable.");
    this.name = "NvidiaUnavailableError";
  }
}

export class NvidiaInvalidResponseError extends Error {
  constructor() {
    super("NVIDIA returned an invalid response.");
    this.name = "NvidiaInvalidResponseError";
  }
}

function parseCompletion(raw: string) {
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    throw new NvidiaInvalidResponseError();
  }

  const completion = nvidiaCompletionSchema.safeParse(body);
  if (!completion.success) throw new NvidiaInvalidResponseError();

  let extraction: unknown;
  try {
    extraction = JSON.parse(completion.data.choices[0].message.content) as unknown;
  } catch {
    throw new NvidiaInvalidResponseError();
  }

  const parsed = aiTransactionExtractionSchema.safeParse(extraction);
  if (!parsed.success) throw new NvidiaInvalidResponseError();
  return parsed.data;
}

export async function requestNvidiaTransactionExtraction(
  request: NvidiaTransactionRequest,
  fetchImpl: typeof fetch = fetch,
) {
  try {
    const response = await fetchImpl(NVIDIA_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${request.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        temperature: 0,
        max_tokens: 256,
        stream: false,
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(NVIDIA_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw new NvidiaUnavailableError();

    const raw = await response.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_NVIDIA_RESPONSE_BYTES) {
      throw new NvidiaInvalidResponseError();
    }

    return parseCompletion(raw);
  } catch (error) {
    if (
      error instanceof NvidiaUnavailableError ||
      error instanceof NvidiaInvalidResponseError
    ) {
      throw error;
    }
    throw new NvidiaUnavailableError();
  }
}

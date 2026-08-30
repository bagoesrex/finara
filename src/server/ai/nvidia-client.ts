import { z } from "zod";

import { aiTransactionExtractionSchema } from "../../lib/ai-transaction";

export const NVIDIA_CHAT_COMPLETIONS_URL =
  "https://integrate.api.nvidia.com/v1/chat/completions";

const NVIDIA_REQUEST_TIMEOUT_MS = 8_000;
const MAX_NVIDIA_RESPONSE_BYTES = 65_536;
const MAX_NVIDIA_OUTPUT_TOKENS = 512;

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

type NvidiaJsonRequest = {
  apiKey: string;
  maxTokens?: number;
  model: string;
  systemPrompt: string;
  userPrompt: string;
};

type NvidiaStructuredJsonRequest<T> = NvidiaJsonRequest & {
  outputSchema: z.ZodType<T>;
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

function parseCompletion<T>(raw: string, outputSchema: z.ZodType<T>) {
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

  const parsed = outputSchema.safeParse(extraction);
  if (!parsed.success) throw new NvidiaInvalidResponseError();
  return parsed.data;
}

export async function requestNvidiaStructuredJson<T>(
  request: NvidiaStructuredJsonRequest<T>,
  fetchImpl: typeof fetch = fetch,
) {
  const maxTokens = request.maxTokens ?? 256;
  if (
    !Number.isSafeInteger(maxTokens) ||
    maxTokens < 1 ||
    maxTokens > MAX_NVIDIA_OUTPUT_TOKENS
  ) {
    throw new NvidiaInvalidResponseError();
  }

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
        max_tokens: maxTokens,
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

    return parseCompletion(raw, request.outputSchema);
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

export function requestNvidiaTransactionExtraction(
  request: NvidiaJsonRequest,
  fetchImpl: typeof fetch = fetch,
) {
  return requestNvidiaStructuredJson(
    { ...request, outputSchema: aiTransactionExtractionSchema },
    fetchImpl,
  );
}

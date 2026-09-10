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

type FetchImplementation = (
  ...args: Parameters<typeof fetch>
) => ReturnType<typeof fetch>;

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
  fetchImpl: FetchImplementation = fetch,
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
    const startedAt = Date.now();
    const systemBytes = new TextEncoder().encode(request.systemPrompt).byteLength;
    const userBytes = new TextEncoder().encode(request.userPrompt).byteLength;
    console.info(
      "[finara-ai] nvidia-request-start",
      JSON.stringify({
        model: request.model,
        maxTokens,
        systemBytes,
        userBytes,
      }),
    );
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

    if (!response.ok) {
      console.warn(
        "[finara-ai] nvidia-request-non-ok",
        JSON.stringify({
          model: request.model,
          maxTokens,
          status: response.status,
          durationMs: Date.now() - startedAt,
        }),
      );
      throw new NvidiaUnavailableError();
    }

    const raw = await response.text();
    const rawBytes = new TextEncoder().encode(raw).byteLength;
    if (rawBytes > MAX_NVIDIA_RESPONSE_BYTES) {
      console.warn(
        "[finara-ai] nvidia-response-too-large",
        JSON.stringify({
          model: request.model,
          rawBytes,
          durationMs: Date.now() - startedAt,
        }),
      );
      throw new NvidiaInvalidResponseError();
    }

    try {
      const parsed = parseCompletion(raw, request.outputSchema);
      console.info(
        "[finara-ai] nvidia-request-success",
        JSON.stringify({
          model: request.model,
          rawBytes,
          durationMs: Date.now() - startedAt,
        }),
      );
      return parsed;
    } catch (error) {
      console.warn(
        "[finara-ai] nvidia-response-invalid",
        JSON.stringify({
          model: request.model,
          rawBytes,
          durationMs: Date.now() - startedAt,
          errorName: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      throw error;
    }
  } catch (error) {
    if (
      error instanceof NvidiaUnavailableError ||
      error instanceof NvidiaInvalidResponseError
    ) {
      throw error;
    }
    console.warn(
      "[finara-ai] nvidia-request-failed",
      JSON.stringify({
        model: request.model,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    throw new NvidiaUnavailableError();
  }
}

export function requestNvidiaTransactionExtraction(
  request: NvidiaJsonRequest,
  fetchImpl: FetchImplementation = fetch,
) {
  return requestNvidiaStructuredJson(
    { ...request, outputSchema: aiTransactionExtractionSchema },
    fetchImpl,
  );
}

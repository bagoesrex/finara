import { z } from "zod";

import { aiTransactionExtractionSchema } from "../../lib/ai-transaction";
import { DEFAULT_AI_BASE_URL } from "./config";

export const AI_REQUEST_TIMEOUT_MS = 8_000;
export const MAX_AI_RESPONSE_BYTES = 65_536;
export const MAX_AI_OUTPUT_TOKENS = 512;

export function resolveChatCompletionsUrl(
  baseUrl: string = DEFAULT_AI_BASE_URL,
): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

const aiCompletionSchema = z
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

export type AiJsonRequest = {
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  model: string;
  systemPrompt: string;
  userPrompt: string;
};

export type AiStructuredJsonRequest<T> = AiJsonRequest & {
  outputSchema: z.ZodType<T>;
};

type FetchImplementation = (
  ...args: Parameters<typeof fetch>
) => ReturnType<typeof fetch>;

export class AiUnavailableError extends Error {
  constructor(message = "AI inference is unavailable.") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export class AiInvalidResponseError extends Error {
  constructor(message = "AI returned an invalid response.") {
    super(message);
    this.name = "AiInvalidResponseError";
  }
}

export const NvidiaUnavailableError = AiUnavailableError;
export type NvidiaUnavailableError = AiUnavailableError;

export const NvidiaInvalidResponseError = AiInvalidResponseError;
export type NvidiaInvalidResponseError = AiInvalidResponseError;

function extractJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;
  return JSON.parse(candidate);
}

function parseCompletion<T>(raw: string, outputSchema: z.ZodType<T>) {
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    throw new AiInvalidResponseError();
  }

  const completion = aiCompletionSchema.safeParse(body);
  if (!completion.success) throw new AiInvalidResponseError();

  let extraction: unknown;
  try {
    extraction = extractJsonContent(completion.data.choices[0].message.content);
  } catch {
    throw new AiInvalidResponseError();
  }

  const parsed = outputSchema.safeParse(extraction);
  if (!parsed.success) throw new AiInvalidResponseError();
  return parsed.data;
}

export async function requestAiStructuredJson<T>(
  request: AiStructuredJsonRequest<T>,
  fetchImpl: FetchImplementation = fetch,
) {
  const maxTokens = request.maxTokens ?? 256;
  if (
    !Number.isSafeInteger(maxTokens) ||
    maxTokens < 1 ||
    maxTokens > MAX_AI_OUTPUT_TOKENS
  ) {
    throw new AiInvalidResponseError();
  }

  const endpoint = resolveChatCompletionsUrl(
    request.baseUrl ?? DEFAULT_AI_BASE_URL,
  );

  try {
    const startedAt = Date.now();
    const systemBytes = new TextEncoder().encode(request.systemPrompt).byteLength;
    const userBytes = new TextEncoder().encode(request.userPrompt).byteLength;
    console.info(
      "[finara-ai] request-start",
      JSON.stringify({
        model: request.model,
        endpoint,
        maxTokens,
        systemBytes,
        userBytes,
      }),
    );

    const response = await fetchImpl(endpoint, {
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
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(
        "[finara-ai] request-non-ok",
        JSON.stringify({
          model: request.model,
          endpoint,
          maxTokens,
          status: response.status,
          durationMs: Date.now() - startedAt,
        }),
      );
      throw new AiUnavailableError();
    }

    const raw = await response.text();
    const rawBytes = new TextEncoder().encode(raw).byteLength;
    if (rawBytes > MAX_AI_RESPONSE_BYTES) {
      console.warn(
        "[finara-ai] response-too-large",
        JSON.stringify({
          model: request.model,
          rawBytes,
          durationMs: Date.now() - startedAt,
        }),
      );
      throw new AiInvalidResponseError();
    }

    try {
      const parsed = parseCompletion(raw, request.outputSchema);
      console.info(
        "[finara-ai] request-success",
        JSON.stringify({
          model: request.model,
          rawBytes,
          durationMs: Date.now() - startedAt,
        }),
      );
      return parsed;
    } catch (error) {
      console.warn(
        "[finara-ai] response-invalid",
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
      error instanceof AiUnavailableError ||
      error instanceof AiInvalidResponseError
    ) {
      throw error;
    }
    console.warn(
      "[finara-ai] request-failed",
      JSON.stringify({
        model: request.model,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    throw new AiUnavailableError();
  }
}

export function requestAiTransactionExtraction(
  request: AiJsonRequest,
  fetchImpl: FetchImplementation = fetch,
) {
  return requestAiStructuredJson(
    { ...request, outputSchema: aiTransactionExtractionSchema },
    fetchImpl,
  );
}

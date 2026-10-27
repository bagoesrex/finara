import {
  AiInvalidResponseError,
  AiUnavailableError,
  requestAiStructuredJson,
  requestAiTransactionExtraction,
  resolveChatCompletionsUrl,
  type AiJsonRequest,
  type AiStructuredJsonRequest,
} from "./ai-client";
import { DEFAULT_NVIDIA_BASE_URL } from "./config";

export const NVIDIA_CHAT_COMPLETIONS_URL = resolveChatCompletionsUrl(
  DEFAULT_NVIDIA_BASE_URL,
);

export {
  AiInvalidResponseError as NvidiaInvalidResponseError,
  AiUnavailableError as NvidiaUnavailableError,
};

export type NvidiaJsonRequest = AiJsonRequest;
export type NvidiaStructuredJsonRequest<T> = AiStructuredJsonRequest<T>;

type FetchImplementation = (
  ...args: Parameters<typeof fetch>
) => ReturnType<typeof fetch>;

export async function requestNvidiaStructuredJson<T>(
  request: NvidiaStructuredJsonRequest<T>,
  fetchImpl?: FetchImplementation,
) {
  return requestAiStructuredJson(
    {
      ...request,
      baseUrl: request.baseUrl ?? DEFAULT_NVIDIA_BASE_URL,
    },
    fetchImpl,
  );
}

export function requestNvidiaTransactionExtraction(
  request: NvidiaJsonRequest,
  fetchImpl?: FetchImplementation,
) {
  return requestAiTransactionExtraction(
    {
      ...request,
      baseUrl: request.baseUrl ?? DEFAULT_NVIDIA_BASE_URL,
    },
    fetchImpl,
  );
}

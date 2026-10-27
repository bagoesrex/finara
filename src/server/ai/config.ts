export const DEFAULT_AI_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_AI_MODEL = "meta-llama/llama-3.3-70b-instruct";

export const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";

export type AiEnvironment = {
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  NVIDIA_API_KEY?: string;
  NVIDIA_MODEL?: string;
};

export class AiConfigurationError extends Error {
  constructor(message = "AI inference is not configured.") {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export const NvidiaConfigurationError = AiConfigurationError;
export type NvidiaConfigurationError = AiConfigurationError;

function normalizeBaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    return rawUrl.trim().replace(/\/+$/, "");
  } catch {
    throw new AiConfigurationError("Invalid AI_BASE_URL.");
  }
}

export function getAiConfig(
  environment: AiEnvironment = {
    AI_API_KEY: process.env.AI_API_KEY,
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_MODEL: process.env.AI_MODEL,
    NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
    NVIDIA_MODEL: process.env.NVIDIA_MODEL,
  },
): { apiKey: string; baseUrl: string; model: string } {
  const isDirectAi = Boolean(environment.AI_API_KEY?.trim());
  const apiKey =
    environment.AI_API_KEY?.trim() || environment.NVIDIA_API_KEY?.trim();

  const rawBaseUrl =
    environment.AI_BASE_URL?.trim() ||
    (isDirectAi ? DEFAULT_AI_BASE_URL : DEFAULT_NVIDIA_BASE_URL);

  const model =
    (isDirectAi
      ? environment.AI_MODEL?.trim() || DEFAULT_AI_MODEL
      : environment.NVIDIA_MODEL?.trim() ||
        environment.AI_MODEL?.trim() ||
        DEFAULT_NVIDIA_MODEL);

  if (!apiKey) {
    console.warn(
      "[finara-ai] config-missing",
      JSON.stringify({ hasApiKey: false, model }),
    );
    throw new AiConfigurationError();
  }

  const baseUrl = normalizeBaseUrl(rawBaseUrl);

  return { apiKey, baseUrl, model };
}

export function getNvidiaConfig(environment?: AiEnvironment) {
  const config = getAiConfig(environment);
  return { apiKey: config.apiKey, model: config.model };
}

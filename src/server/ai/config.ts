export const DEFAULT_NVIDIA_MODEL =
  "nvidia/nemotron-3.5-lightning-30b-a3b";

const modelPattern =
  /^[a-z0-9][a-z0-9._-]{0,63}\/[a-z0-9][a-z0-9._-]{0,127}$/i;

type NvidiaEnvironment = {
  NVIDIA_API_KEY?: string;
  NVIDIA_MODEL?: string;
};

export class NvidiaConfigurationError extends Error {
  constructor() {
    super("NVIDIA inference is not configured.");
    this.name = "NvidiaConfigurationError";
  }
}

export function getNvidiaConfig(
  environment: NvidiaEnvironment = {
    NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
    NVIDIA_MODEL: process.env.NVIDIA_MODEL,
  },
) {
  const apiKey = environment.NVIDIA_API_KEY?.trim();
  const model = environment.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;

  if (!apiKey || !modelPattern.test(model)) {
    throw new NvidiaConfigurationError();
  }

  return { apiKey, model };
}

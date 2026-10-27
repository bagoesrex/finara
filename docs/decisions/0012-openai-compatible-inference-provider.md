# ADR 0012: OpenAI-Compatible Inference Provider for AI Features

**Status:** Accepted
**Date:** 2026-10-27
**Decision owner:** Product owner

## Context

Finara previously used NVIDIA Build's hosted Chat Completions endpoint (`https://integrate.api.nvidia.com/v1`) under [ADR 0007](./0007-nvidia-build-for-ai-inference.md). While NVIDIA Build provided a prototype endpoint, modern multi-model routing gateways such as **9router**, **OpenRouter**, or self-hosted OpenAI-compatible gateways offer higher flexibility, broader model selection (e.g. Gemini, Llama 3.3, DeepSeek, Qwen), and configurable routing without vendor lock-in.

The application requires an OpenAI-compatible interface where the endpoint URL, model identifier, and authentication token can be configured purely through server-only environment variables.

Because PostgreSQL remains the single source of truth for all balances, transactions, and budgets, and the database schema (`AiRateLimit`) only tracks per-user request counts independently of the model provider, no database schema changes or data migrations are required.

## Decision

1. **Generic OpenAI-Compatible Client**:
   - Replace provider-specific NVIDIA logic with a generic OpenAI-compatible chat completions client.
   - Endpoint target is derived dynamically from `AI_BASE_URL` (e.g. `${AI_BASE_URL.replace(/\/$/, "")}/chat/completions`).
   - If `AI_BASE_URL` is omitted, default to standard OpenAI-compatible routing (e.g. `https://openrouter.ai/api/v1` or `https://api.9router.com/v1`).
2. **Environment Variable Configuration**:
   - `AI_API_KEY`: Server-only bearer token for the inference provider.
   - `AI_BASE_URL`: Base URL for the OpenAI-compatible API (e.g. `https://api.9router.com/v1` or `https://openrouter.ai/api/v1`).
   - `AI_MODEL`: Model identifier string (e.g. `meta-llama/llama-3.3-70b-instruct` or provider-specific model slug).
   - For backwards-compatibility during migration, `NVIDIA_API_KEY` and `NVIDIA_MODEL` will be supported as fallbacks if `AI_API_KEY` is not yet set.
3. **Execution Guardrails**:
   - Maintain the strict 8-second request timeout (`AbortSignal`).
   - Maintain non-streaming JSON mode (`response_format: { type: "json_object" }`).
   - Maintain zero temperature (`temperature: 0`) and capped output tokens (`max_tokens: 512`) to enforce deterministic, concise structured output.
   - Data minimization remains unchanged: only transaction text, Jakarta calendar date context, and user category names/types are passed to the model. No user IDs, balances, account details, or history are shared.
   - Response validation remains strict using Zod schemas (`aiTransactionExtractionSchema` and intent schemas).
4. **Database & Rate Limiting**:
   - The PostgreSQL `AiRateLimit` table and rate-limiting policies (`AI_PREVIEW_RATE_LIMIT_MAX`, `AI_PREVIEW_RATE_LIMIT_WINDOW_SECONDS`) remain unchanged and govern access to the new provider identically.
5. **Developer & Evaluation Tooling**:
   - Rename/update verification scripts (`scripts/check-ai-inference.ts` and `scripts/evaluate-ai-transaction-parsing.ts`).
   - Update `package.json` command aliases (`bun run ai:check` and `bun run ai:eval:transactions`).
   - Document new variables in `.env.example` and set up placeholders in `.env`.

## Consequences

- Finara can switch between 9router, OpenRouter, Groq, Ollama, OpenAI, or NVIDIA Build simply by editing environment variables.
- The core financial boundary is preserved: model output remains untrusted until validated and confirmed by the user.
- ADR 0007 is superseded regarding the hardcoded NVIDIA Build endpoint and provider-specific error names.

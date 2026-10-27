# OpenAI-Compatible Inference Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Finara's AI inference layer from a proprietary NVIDIA Build configuration to a flexible OpenAI-compatible client supporting 9router, OpenRouter, and standard gateways via environment variables (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`).

**Architecture:** A generic OpenAI-compatible HTTP client replaces the NVIDIA-specific client at `src/server/ai/`, connecting to `${AI_BASE_URL}/chat/completions` with Bearer token authentication. It preserves strict data minimization, JSON-mode schema validation with Zod, and 8-second request timeouts. Existing caller routes, deterministic tools, and PostgreSQL rate-limits remain identical.

**Tech Stack:** TypeScript, Bun, Next.js (App Router, Server Components & Route Handlers), Zod, OpenAI-compatible Chat Completions API.

**Spec:** `docs/decisions/0012-openai-compatible-inference-provider.md` and `docs/specs/09-ai-assistant.md`

## Global Constraints

- Server-only for all AI configuration and client modules (`import "server-only";`).
- Store credentials only in server environment variables (`AI_API_KEY`, never `NEXT_PUBLIC_*`).
- Preserves 8-second timeout (`AbortSignal`) and non-streaming JSON mode (`response_format: { type: "json_object" }`).
- Capped output tokens (max 512, default 256) and temperature 0.
- Strict data minimization: no user IDs, account IDs, category IDs, balances, or transaction history are sent to the model.
- Backward compatibility: fallback to `NVIDIA_API_KEY` and `NVIDIA_MODEL` when `AI_API_KEY` or `AI_MODEL` are not provided.
- Quality gates must be clean after each task: `bun run test`, `bun run lint`, `bun run typecheck`.

## Review Focus

1. **Trailing slashes in `AI_BASE_URL`**: `AI_BASE_URL` values such as `https://openrouter.ai/api/v1/` or `https://api.9router.com/v1` must normalize cleanly to `${baseUrl.replace(/\/+$/, "")}/chat/completions`.
2. **Missing or empty `AI_API_KEY`**: If neither `AI_API_KEY` nor `NVIDIA_API_KEY` is present, it must fail safely with `AiConfigurationError` and map to `503 AI_UNAVAILABLE` on public endpoints without throwing uncaught runtime exceptions.
3. **Invalid JSON / markdown codeblocks from LLMs**: Providers sometimes return Markdown ```json blocks; JSON parsing must sanitize or validate cleanly through Zod schemas.
4. **Model identifier formatting**: Allow diverse model strings (e.g. `meta-llama/llama-3.3-70b-instruct`, `gpt-4o-mini`, `google/gemini-2.5-flash`), not just NVIDIA-prefixed ones.
5. **Preserving existing rate limits**: PostgreSQL-backed `AiRateLimit` quota continues to function transparently regardless of the model provider.

---

### Task 1: Generic AI Configuration Module

**Files:**
- Modify: `src/server/ai/config.ts`
- Modify: `src/server/ai/config.test.ts`

**Interfaces:**
- Consumes: Environment variables (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, with fallback to `NVIDIA_API_KEY`, `NVIDIA_MODEL`).
- Produces:
  - `getAiConfig(env?: AiEnvironment): { apiKey: string; baseUrl: string; model: string }`
  - `AiConfigurationError` class
  - Backward-compatibility aliases: `getNvidiaConfig`, `NvidiaConfigurationError`

- [ ] **Step 1: Write failing tests in `src/server/ai/config.test.ts`**
  Cover `AI_API_KEY`, custom `AI_BASE_URL` normalization, `AI_MODEL`, fallback to `NVIDIA_API_KEY`, and validation errors.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test src/server/ai/config.test.ts`
  Expected: FAIL (missing exports or properties)

- [ ] **Step 3: Implement `src/server/ai/config.ts`**
  Add `getAiConfig`, `AiConfigurationError`, and backward-compatible aliases. Default `AI_BASE_URL` to `https://openrouter.ai/api/v1` or standard endpoint.

- [ ] **Step 4: Run test to verify it passes**
  Run: `bun test src/server/ai/config.test.ts`
  Expected: PASS

- [ ] **Step 5: Run linter and typecheck**
  Run: `bun run lint && bun run typecheck`
  Expected: PASS

- [ ] **Step 6: Commit**
  ```bash
  git add src/server/ai/config.ts src/server/ai/config.test.ts
  git commit -m "feat(ai): support flexible openai-compatible configuration with fallback"
  ```

---

### Task 2: Generic OpenAI-Compatible Client

**Files:**
- Create: `src/server/ai/ai-client.ts`
- Create: `src/server/ai/ai-client.test.ts`
- Modify: `src/server/ai/nvidia-client.ts` (re-export from `ai-client.ts` for smooth compatibility)
- Modify: `src/server/ai/nvidia-client.test.ts`

**Interfaces:**
- Consumes: `getAiConfig()`, `aiTransactionExtractionSchema`.
- Produces:
  - `AiUnavailableError`, `AiInvalidResponseError`
  - `requestAiStructuredJson<T>(request, fetchImpl)`
  - `requestAiTransactionExtraction(request, fetchImpl)`
  - Aliases for existing NVIDIA symbols.

- [ ] **Step 1: Write tests in `src/server/ai/ai-client.test.ts`**
  Test OpenAI-compatible payload generation (`Authorization: Bearer ...`, `messages`, `response_format`), valid JSON handling, invalid response handling, and timeout/network error handling.

- [ ] **Step 2: Run test to verify it fails**
  Run: `bun test src/server/ai/ai-client.test.ts`
  Expected: FAIL

- [ ] **Step 3: Implement `src/server/ai/ai-client.ts`**
  Implement `requestAiStructuredJson` targeting `${baseUrl}/chat/completions` with 8s timeout, text encoder byte logging, and Zod output schema parsing.

- [ ] **Step 4: Wire `src/server/ai/nvidia-client.ts` to delegate to `ai-client.ts`**
  Keep `nvidia-client.ts` as an alias wrapper to avoid breaking any callers during migration.

- [ ] **Step 5: Run client tests to verify they pass**
  Run: `bun test src/server/ai/ai-client.test.ts src/server/ai/nvidia-client.test.ts`
  Expected: PASS

- [ ] **Step 6: Run linter and typecheck**
  Run: `bun run lint && bun run typecheck`
  Expected: PASS

- [ ] **Step 7: Commit**
  ```bash
  git add src/server/ai/ai-client.ts src/server/ai/ai-client.test.ts src/server/ai/nvidia-client.ts src/server/ai/nvidia-client.test.ts
  git commit -m "feat(ai): add generic openai-compatible chat completions client"
  ```

---

### Task 3: Migrate AI Composer & Transaction Preview Services

**Files:**
- Modify: `src/server/ai/transaction-preview.ts`
- Modify: `src/server/ai/composer-response.ts`
- Modify: `src/server/ai/composer-response.test.ts`
- Modify: `src/server/http/finance-api.ts`

**Interfaces:**
- Consumes: `getAiConfig`, `requestAiStructuredJson`, `requestAiTransactionExtraction`, `AiConfigurationError`, `AiUnavailableError`, `AiInvalidResponseError`.
- Produces: Updated application services and HTTP error handlers recognizing generic AI errors.

- [ ] **Step 1: Update `src/server/ai/transaction-preview.ts` and `composer-response.ts`**
  Switch from `getNvidiaConfig` and `requestNvidia*` to `getAiConfig` and `requestAi*`.

- [ ] **Step 2: Update `src/server/http/finance-api.ts`**
  Catch `AiConfigurationError`, `AiUnavailableError`, `AiInvalidResponseError` (along with their backward-compatible aliases) and map cleanly to `503 AI_UNAVAILABLE`.

- [ ] **Step 3: Run existing unit and integration tests**
  Run: `bun test src/server/ai/`
  Expected: PASS

- [ ] **Step 4: Run linter and typecheck**
  Run: `bun run lint && bun run typecheck`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/server/ai/transaction-preview.ts src/server/ai/composer-response.ts src/server/ai/composer-response.test.ts src/server/http/finance-api.ts
  git commit -m "refactor(ai): integrate generic ai client into composer and preview services"
  ```

---

### Task 4: Developer Scripts, package.json, and Environment Config

**Files:**
- Create: `scripts/check-ai-inference.ts`
- Create: `scripts/evaluate-ai-transaction-parsing.ts`
- Modify: `scripts/check-nvidia-inference.ts` (delegate or keep as alias)
- Modify: `scripts/evaluate-nvidia-transaction-parsing.ts` (delegate or keep as alias)
- Modify: `package.json` (add/update `ai:check` command)
- Modify: `.env.example`
- Modify: `.env`

- [ ] **Step 1: Update scripts to use generic AI client**
  Point scripts to `getAiConfig` and `requestAiStructuredJson`.

- [ ] **Step 2: Update `package.json` scripts**
  Add `"ai:check": "bun ./scripts/check-ai-inference.ts"`, keeping `"ai:check:nvidia"` as an alias.

- [ ] **Step 3: Update `.env.example` and `.env`**
  Add `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` to `.env.example` and local `.env`.

- [ ] **Step 4: Run all test and build quality gates**
  Run:
  - `bun run test`
  - `bun run lint`
  - `bun run typecheck`
  - `bun run build`
  Expected: All PASS with 0 errors.

- [ ] **Step 5: Commit**
  ```bash
  git add scripts/ package.json .env.example
  git commit -m "chore(ai): update inference verification scripts and environment templates"
  ```

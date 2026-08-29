# ADR 0007: NVIDIA Build for MVP AI Inference

**Status:** Accepted
**Date:** 2026-08-30
**Decision owner:** Product owner

## Context

Finara's Home composer already has an editable confirmation flow and a
PostgreSQL-backed transaction lifecycle, but its natural-language parsing is a
local deterministic prototype. The MVP now needs a real model boundary without
allowing model output to become financial authority or adding a generic chat
surface.

The product owner selected NVIDIA Build because its model catalog provides free
prototype endpoints. NVIDIA documents an OpenAI-compatible hosted Chat
Completions endpoint at `https://integrate.api.nvidia.com/v1` and exposes
`nvidia/nemotron-3.5-lightning-30b-a3b` as a free prototype endpoint.

## Decision

For the first AI-assisted transaction slice:

- Use NVIDIA Build's hosted
  `https://integrate.api.nvidia.com/v1/chat/completions` endpoint.
- Default to `nvidia/nemotron-3.5-lightning-30b-a3b`, while allowing a valid
  `provider/model` identifier to be selected with the server-only
  `NVIDIA_MODEL` environment variable.
- Store the credential only in `NVIDIA_API_KEY`. Never use a `NEXT_PUBLIC_`
  variable for the key.
- Use the platform `fetch` API instead of adding an SDK for one non-streaming
  JSON request.
- Disable reasoning for this extraction task, use temperature zero, cap output
  at 256 tokens, apply an eight-second timeout, and do not automatically retry.
- Ask for JSON-only output and validate the complete provider envelope and
  extraction object with strict application schemas. NVIDIA output remains
  untrusted even when JSON mode succeeds.
- Expose parsing as authenticated
  `POST /api/ai/transaction-previews`. The endpoint creates a proposed preview;
  it cannot persist a transaction.
- Resolve account and category IDs in server code from records owned by the
  authenticated user. The model receives category names and types, not IDs,
  balances, transactions, budgets, or another user's data.
- Keep static instructions modular under `src/ai/`. User input and category
  names are serialized as an explicit data object rather than interpolated as
  instructions.
- Preserve the original input on ambiguous, invalid, unavailable, or timed-out
  responses. Offer an explicit manual-entry fallback through the existing
  confirmation sheet.

NVIDIA Build's free endpoint is a prototyping dependency, not a production SLA
or a promise of permanent zero cost. The provider and model remain behind a
narrow application boundary so a later replacement does not change the Home or
transaction persistence contracts.

## Threat model and required controls

### Assets

- The server-only NVIDIA API credential and shared prototype quota.
- Private transaction text and user-owned account/category references.
- The integrity of persisted balances and transaction history.

### Trust boundaries

- Untrusted transaction text entering the Route Handler.
- User-owned category names entering the model context as data.
- NVIDIA HTTP and model output returning to the application.
- A parsed preview crossing from server JSON into browser state.

### Controls

- Require an authenticated server session and reject cross-origin POSTs.
- Cap request-body size and transaction-text length before provider access.
- Use one hardcoded HTTPS provider endpoint; no request field or environment
  value can select an arbitrary outbound URL.
- Cap time and generated tokens and perform at most one provider call per
  request.
- Never include the API key in a prompt, response, or log.
- Strictly validate provider JSON, exact money, dates, times, and public DTOs.
- Never trust client-provided user IDs or provider-produced account/category
  IDs.
- Require the existing editable confirmation action before transaction
  persistence.

## Consequences

- Home uses real model inference while PostgreSQL and server validation remain
  authoritative.
- The free endpoint can be unavailable, rate limited, renamed, or repriced; the
  UI must retain retry and manual paths.
- Parsing latency is bounded below the product's ten-second recording target,
  but a timeout can still move the user to manual entry.
- Basic financial questions and tool calling remain a separate later slice.
- A production launch must re-evaluate provider quota, availability, privacy
  terms, and operational rate limiting.

## Alternatives considered

### Keep the deterministic parser as the primary parser

Rejected because it handles only known phrases and does not fulfill the product
promise of AI-assisted natural-language entry. It remains useful only as the
explicit manual fallback helper.

### Add the OpenAI SDK against NVIDIA's compatible API

Deferred because the MVP uses one small non-streaming HTTP operation. Native
`fetch` keeps the dependency and supply-chain surface smaller.

### Let the model create transactions directly

Rejected because it bypasses the MVP confirmation requirement and grants the
model excessive authority over financial state.

### Send balances or transaction history with every parse

Rejected because parsing a new transaction requires only the text, current
Jakarta date, and available category names/types.

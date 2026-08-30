# ADR 0008: Application-Managed Tools for Read-Only Financial Questions

**Status:** Accepted
**Date:** 2026-08-30
**Decision owner:** Product owner

## Context

ADR 0007 introduced NVIDIA Build for transaction extraction. Finara's MVP also
needs basic questions about the authenticated user's balance, current-month
income and spending, category totals, and budgets. These answers must remain
authoritative even when model wording or provider behavior changes.

NVIDIA NIM documents function calling through `tools` and `tool_choice`, but
tool-parser support is configured per model and deployment. The hosted NVIDIA
Build model selected in ADR 0007 already has a verified JSON response boundary,
while its hosted tool-parser configuration is not part of Finara's application
contract. See NVIDIA's [function-calling documentation](https://docs.nvidia.com/nim/large-language-models/1.15.0/function-calling.html)
and the hosted [Nemotron 3.5 Build page](https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b/build).

## Decision

For the first read-only financial-question slice:

- Add authenticated `POST /api/ai/composer-responses` without changing the
  existing transaction-preview resource.
- Make one bounded NVIDIA JSON request that selects exactly one application
  intent: transaction preview, balance, current-month income/spending summary,
  current-month budget, or unsupported.
- Validate the complete intent as a strict discriminated union. Model output
  cannot contain a user ID, account/category record ID, SQL, calculated amount,
  or persistence instruction.
- Resolve identity only from the server session. Every database query includes
  that user ID, excludes soft-deleted transactions, and uses the Jakarta current
  month where applicable.
- Execute read tools in application code and format exact IDR values
  deterministically. Financial records, balances, budget values, and computed
  answers are never sent back to NVIDIA.
- Return the deterministic answer directly to Home; do not make a second model
  call to rephrase it and do not create conversation history.
- Keep transaction creation on the existing editable preview and explicit-save
  path. A question or unsupported intent cannot mutate financial state.
- Share the persisted per-user AI quota across both AI endpoints.
- Limit this slice to available balance, current-month income/expense totals,
  current-month category totals/top category, and current-month budget
  remaining. Other periods, merchant search, comparisons, and advice return a
  short limitation response.

## Consequences

- PostgreSQL and server code remain the only financial authority; the model is
  an intent router and transaction extractor.
- A question uses one provider call and the minimum category-name/type context.
- Hosted native tool calling can be adopted later behind the same application
  intents if its model/deployment configuration is explicitly verified.
- The first slice intentionally does not satisfy cross-period questions,
  merchant/description search, or follow-up conversation memory.
- The Home composer stays a single-purpose financial interaction rather than a
  generic chatbot.

## Alternatives considered

### Use hosted native tool calling immediately

Deferred because NVIDIA documents parser and tool-choice behavior as
model/deployment-specific. Depending on an unverified hosted parser would make
the MVP boundary less predictable without improving server authorization.

### Send financial data to NVIDIA for answer generation

Rejected because the application can calculate and phrase these small answers
deterministically. A second model call would increase latency, privacy exposure,
and opportunities for numerical drift.

### Route questions with local keywords only

Rejected as the primary path because Indonesian phrasing and category requests
need the same natural-language flexibility as transaction entry. Strict local
schemas and allowlisted server execution still constrain the model's authority.

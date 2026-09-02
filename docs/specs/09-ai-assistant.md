# Spec: AI Assistant

**Status:** Accepted for MVP transaction parsing and current-month questions
**PRD source:** Sections 15-18, 24-29, 54-56

## Objective

Use AI as a concise interaction layer for transaction parsing and questions about the user's own financial data. The model interprets intent; deterministic server tools authorize access, read data, calculate results, and persist changes.

## Supported MVP intents

1. Parse a proposed income or expense transaction.
2. Ask for the current available balance.
3. Ask for current-month spending or income totals and category totals/ranking.
4. Ask for current-month remaining category or overall budget.

Unsupported requests receive a brief limitation response and do not trigger unrelated tools.
Cross-period comparison, merchant/description search, and conversation history
remain later slices.

## Transaction parsing

- **AI-001:** The parser extracts transaction type, amount, description, category, date, and time when present.
- **AI-002:** The parser normalizes Indonesian shorthand such as `rb`, `ribu`,
  `k`, and `jt`, plus relative Jakarta dates, into the strict structured output.
- **AI-003:** The model returns structured data rather than free-form text for transaction creation.
- **AI-004:** Missing or ambiguous required values are surfaced for correction instead of guessed silently.
- **AI-005:** Parsed data is mapped to authorized account/category identifiers on the server.
- **AI-006:** The MVP always presents a transaction preview before persistence.
- **AI-016:** Qualitative Indonesian time words use editable representative
  local times in previews: `pagi` 08:00, `siang` 12:00, `sore` 16:00, and
  `malam` 20:00. Users still confirm or edit the value before save.

Structured parsing contract:

```text
intent
type
amount
description
categoryHint
transactionDate
transactionTime
missingFields[]
```

The runtime schema strictly validates positive whole-IDR digits, calendar dates,
local `HH:mm` time, bounded descriptions, and the exact missing-field vocabulary.

## Financial questions

- **AI-007:** The model selects a narrowly scoped read tool; it never answers numerical questions from conversation memory.
- **AI-008:** Tool parameters are validated and automatically scoped to the authenticated user.
- **AI-009:** Totals, comparisons, and budget remaining are calculated by server code or database queries, not model arithmetic.
- **AI-010:** Responses show the result, period, and a small useful breakdown when available.
- **AI-011:** Follow-up suggestions are optional and limited to a few contextually relevant actions.

## Tool boundary

Initial tools may include:

- `create_transaction`
- `get_transactions`
- `get_balance`
- `get_budget`
- `get_spending_summary`

Tool implementations must authenticate, authorize, validate, and return only the minimum result required. Tool names do not authorize direct database access by the model.

## Accepted transaction-parsing boundary

Following [ADR 0007](../decisions/0007-nvidia-build-for-ai-inference.md),
transaction parsing uses NVIDIA Build's hosted Chat Completions endpoint with
`nvidia/nemotron-3.5-lightning-30b-a3b` as the configurable default model.
Parsing is exposed as authenticated `POST /api/ai/transaction-previews` and can
only return `ready` or `needs_input`; it cannot persist a transaction. The
server maps model hints to the authenticated user's account and category IDs,
and the existing transaction API remains the only persistence boundary after
explicit confirmation. Provider-bound preview requests are limited per user by
a PostgreSQL-backed fixed window (10 requests per 60 seconds by default).
Exhausted quota returns `429 AI_RATE_LIMITED` with `Retry-After`; it never
creates a transaction.

## Accepted transaction-parsing evaluation

Dataset `1.0.0` fixes the Jakarta reference date at `2026-08-30` and contains
all five transaction phrases in the PRD. Evaluation checks intent, type, exact
whole-IDR amount, description meaning, category, relative date, qualitative
time, and missing fields separately. Description checks use required terms
rather than one exact model-authored phrase; `tadi pagi` accepts an `HH:mm`
inside the documented morning period.

The deterministic matcher runs in the normal Vitest suite. Run
`bun run ai:eval:transactions` with the ignored local NVIDIA credential to
evaluate the same cases against the configured hosted model. Every documented
golden case must pass; this gate does not silently establish a broader model
benchmark.

## Accepted current-month question boundary

Following [ADR 0008](../decisions/0008-application-managed-ai-finance-tools.md),
authenticated `POST /api/ai/composer-responses` uses one strict NVIDIA JSON
response to select an allowlisted intent. It receives user text, Jakarta date
context, and available category names/types, but no account IDs, category IDs,
balances, transactions, budgets, or calculated answers. Server tools inject the
session user ID, query PostgreSQL, calculate exact IDR values, and return concise
application-authored text without a second model call.

The accepted first slice covers available balance; current-month income,
expense, category totals, and top category; and current-month category or
overall budget remaining. It shares the persisted quota from ADR 0007. Home
renders a transaction preview, one announced financial answer, or a short
unsupported message from the same composer without storing chat history.

## Response style

- **AI-012:** Responses are concise, factual, calm, contextual, and non-judgmental.
- **AI-013:** Responses omit greetings, claims of successful understanding, and long analysis preambles.
- **AI-014:** AI may describe patterns in the user's data but does not make absolute investment or professional-advice claims.
- **AI-015:** Empty or insufficient data is stated directly without fabricating an answer.

## Prompt organization

Static instructions should be modular when implemented:

```text
ai/
|-- system.md
|-- transaction-parser.md
|-- categories.md
|-- financial-insight.md
`-- response-style.md
```

Financial records are fetched at request time and are not embedded in static prompt files.

## Failure behavior

- Timeout/provider failure preserves user input and offers retry or manual entry.
- Invalid structured output is rejected and may be retried within a bounded policy.
- Tool failure returns a short user-facing error without exposing internal details.
- Rate-limited composer requests preserve user input; transaction-shaped input
  retains the existing retry or manual-entry path.
- Ambiguous intent asks one focused clarification or routes the user to manual entry.
- No model response can bypass server validation or confirmation.

## Acceptance criteria

- Representative phrases from the PRD parse into correct editable previews: `makan 25rb`, `gaji masuk 5jt`, `kemarin beli bensin 50 ribu`, `bayar wifi 350k`, and `grab 22rb tadi pagi`.
- Available balance, current-month totals/top category, and remaining budget use
  authorized stored data. Other periods and merchant totals return the bounded
  unsupported response in this slice.
- Changing model wording cannot change deterministic totals returned by tools.
- No transaction is saved from a parsing response without explicit MVP confirmation.
- Prompts and logs do not receive a user's complete financial dataset by default.
- Provider failure has a recoverable manual path.

## Deferred behavior

- The deterministic PRD dataset is the portfolio gate. Live NVIDIA checks are
  optional demonstrations, not a vendor-approval requirement.
- Conversation persistence and `AIConversation` remain Phase 2 and require a
  retention decision.
- Date-language coverage is limited to the accepted Jakarta-relative examples;
  new phrases expand the versioned dataset before implementation.
- Natural-language transaction search remains Phase 2, as stated by the PRD.

See [ADR 0011](../decisions/0011-portfolio-mvp-as-the-acceptance-boundary.md).

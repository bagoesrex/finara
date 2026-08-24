# Spec: AI Assistant

**Status:** Draft  
**PRD source:** Sections 15-18, 24-29, 54-56

## Objective

Use AI as a concise interaction layer for transaction parsing and questions about the user's own financial data. The model interprets intent; deterministic server tools authorize access, read data, calculate results, and persist changes.

## Supported MVP intents

1. Parse a proposed income or expense transaction.
2. Ask for spending or income totals over a period.
3. Ask for spending grouped by category.
4. Ask for remaining category budget.
5. Compare basic spending periods.
6. Ask for transactions matching a merchant/description concept when supported by the available tools.

Unsupported requests receive a brief limitation response and do not trigger unrelated tools.

## Transaction parsing

- **AI-001:** The parser extracts transaction type, amount, description, category, date, and time when present.
- **AI-002:** Indonesian shorthand such as `rb`, `ribu`, `k`, `jt`, and relative dates is normalized deterministically after structured extraction.
- **AI-003:** The model returns structured data rather than free-form text for transaction creation.
- **AI-004:** Missing or ambiguous required values are surfaced for correction instead of guessed silently.
- **AI-005:** Parsed data is mapped to authorized account/category identifiers on the server.
- **AI-006:** The MVP always presents a transaction preview before persistence.

Draft parsing contract:

```text
intent
type
amount
description
categoryHint
transactionDate
transactionTime?
confidence?
missingFields[]
```

The final validation schema and money/date representations must be approved with the data model.

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
- Ambiguous intent asks one focused clarification or routes the user to manual entry.
- No model response can bypass server validation or confirmation.

## Acceptance criteria

- Representative phrases from the PRD parse into correct editable previews: `makan 25rb`, `gaji masuk 5jt`, `kemarin beli bensin 50 ribu`, `bayar wifi 350k`, and `grab 22rb tadi pagi`.
- Queries such as weekly spending, top category, remaining food budget, Grab total, and weekly income use authorized stored data.
- Changing model wording cannot change deterministic totals returned by tools.
- No transaction is saved from a parsing response without explicit MVP confirmation.
- Prompts and logs do not receive a user's complete financial dataset by default.
- Provider failure has a recoverable manual path.

## Open questions

- LLM provider, model, latency budget, and cost ceiling.
- Structured-output schema and bounded retry policy.
- Confidence calibration and evaluation dataset.
- Conversation persistence and retention; `AIConversation` is Phase 2.
- Exact supported date language and timezone rules.
- Whether natural-language transaction search remains Phase 2 or is included through basic query tools.

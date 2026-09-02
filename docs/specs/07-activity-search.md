# Spec: Activity, Search, and Transaction Detail

**Status:** Accepted for MVP
**PRD source:** Sections 19-21

## Objective

Make complete transaction history easy to scan and search without turning Activity into a dense accounting ledger.

## Activity requirements

- **ACT-001:** Activity displays transactions as a simple list grouped by transaction date.
- **ACT-002:** Each row exposes description, signed amount, and enough category/date context to distinguish the entry.
- **ACT-003:** The view communicates its active month or date range, such as `August 2026`.
- **ACT-004:** Income and expense remain distinguishable without depending on color alone.
- **ACT-005:** Loading additional history preserves the user's scroll and current filters.
- **ACT-006:** The list avoids a separate card around every transaction.

## Search requirements

- **ACT-007:** Search matches merchant or description text, category, and amount as required by the PRD.
- **ACT-008:** Text matching is case-insensitive and appropriate for concise Indonesian queries.
- **ACT-009:** Search results remain scoped to the current user.
- **ACT-010:** Clearing search restores the prior Activity context.
- **ACT-011:** A no-results state distinguishes `no matching transactions` from `no transactions yet`.

## Transaction detail

The detail surface shows only useful information:

- description
- amount and type
- category
- transaction date and relevant time
- account
- note, with a minimal empty representation
- edit and delete actions for the owner

- **ACT-012:** Detail is addressable from a transaction row and preserves a clear path back to Activity.
- **ACT-013:** Stale or deleted transaction links fail safely without leaking whether another user's record exists.
- **ACT-014:** Edit and delete use the transaction lifecycle rules in [`06-transactions.md`](./06-transactions.md).

## UI states

- Initial loading and incremental loading.
- Empty history.
- Populated grouped history.
- Search active, no results, and failed.
- Detail loading, missing, populated, edit pending, and delete pending.

## Acceptance criteria

- Transactions are ordered by transaction date and grouped under correct date labels.
- Switching the active period never mixes records from an unintended period.
- A query such as `kopi` returns matching descriptions/merchants and relevant categories.
- Amount search uses the product's normalized money representation rather than formatted-string coincidence.
- Search and detail never expose another user's transaction.
- Empty, no-result, loading, and failure states are visually distinct and actionable.

## Settled MVP behavior

- Activity uses an all-history scope labeled `Semua periode`; month navigation is
  outside the MVP because the PRD defines this surface as the complete history.
- History loads incrementally with a stable cursor and a 20-record default page.
- Search has no minimum length. Rendering uses React's deferred value while the
  server still validates and caps the query at 80 characters.
- Exact amount queries accept plain IDR digits, consistent `.` or `,` thousands
  groups, and Indonesian shorthand such as `25rb` and `1,5jt`.
- Merchant remains part of the transaction description for MVP; it is not a
  separate persisted field.
- The MVP Activity UI exposes free-text search only. Additional account,
  category, type, and date controls require a later product decision.

## Verification evidence

- Contract tests cover valid, ambiguous, overflowing, and mixed-separator amount
  inputs without using floating-point money arithmetic.
- PostgreSQL service and production HTTP checks verify exact amount matching,
  user scoping, text fields, and cursor bounds.
- Mobile Edge covers the all-history label, amount search, no-results and clear
  states, transaction-detail navigation, incremental loading, retained search
  context, and non-reset scroll position.

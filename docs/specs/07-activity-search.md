# Spec: Activity, Search, and Transaction Detail

**Status:** Draft  
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

## Open questions

- Pagination strategy: cursor, page, or incremental date windows.
- Default Activity period and navigation between months.
- Search debounce and minimum query length.
- Whether merchant becomes a dedicated transaction field.
- Filter scope beyond search, such as type, account, category, and date.

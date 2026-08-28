# ADR 0005: Positive IDR Transactions and Soft Delete

**Status:** Accepted
**Date:** 2026-08-28
**Decision owner:** Product owner

## Context

Finara is ready to replace its in-memory transaction prototype with PostgreSQL-backed data. The first transaction migration must preserve exact money, prevent cross-user references and duplicate saves, define date and optional-time semantics, and make deletion safe without introducing post-MVP accounting concepts.

ADR 0003 already establishes whole-rupiah `BIGINT` storage, IDR-only MVP behavior, and `Asia/Jakarta` calendar dates. ADR 0002 establishes PostgreSQL as authoritative while TanStack Query synchronizes mutable client server-state.

## Decision

For the MVP transaction lifecycle:

- Store `amount` as a strictly positive whole-rupiah PostgreSQL `BIGINT`. `type` (`INCOME` or `EXPENSE`) is the only persisted direction; negative or zero amounts are invalid.
- Serialize money as base-10 strings at every public JSON boundary. Client display adapters may convert only values that are within JavaScript's safe-integer range.
- Store `transactionDate` as a PostgreSQL calendar date interpreted in `Asia/Jakarta`. Store an optional `transactionTime` as a timezone-free local wall-clock time paired with that date. Operational timestamps remain UTC `timestamptz`.
- Use one required, trimmed `description` field for the MVP. Separate merchant, note, and AI-provenance fields remain deferred.
- Give each create request a client-generated UUID `clientRequestId`, unique per user. Retrying the same request returns the existing transaction instead of creating a duplicate.
- Enforce ownership structurally: a transaction's account and category must belong to its user, and the category type must match the transaction type. Application authorization still scopes every read and mutation to the server-resolved session user.
- Delete by setting an optional UTC `deletedAt` tombstone. Normal balance, spending, activity, search, and budget queries exclude deleted rows. The MVP has no restore UI, audit-history UI, or automatic purge policy.
- Transfers are outside the MVP. Moving money between accounts must not be represented as an arbitrary income/expense pair until transfer semantics are explicitly designed.
- Expose authenticated transaction reads and mutations through narrow Next.js Route Handlers. Server Components read application services directly for initial TanStack Query hydration; they do not call the application's own HTTP endpoints.
- After successful mutations, TanStack Query invalidates affected transaction lists, details, balances, monthly summaries, and budget-derived views. Financial totals are refetched from PostgreSQL rather than optimistically recalculated in the browser.

## Threat model and integrity controls

### Assets

- Transaction contents and derived balances.
- Account and category ownership relationships.
- Idempotency keys used to prevent duplicate financial records.

### Trust boundaries

- Untrusted query parameters and JSON entering Route Handlers.
- The authenticated session identity entering application services.
- Database records crossing into public JSON DTOs.

### Required controls

- Never accept a client-provided user ID for authorization.
- Validate UUIDs, type, amount, description, calendar date, and optional time before database access.
- Treat inaccessible transaction, account, and category IDs as not found; do not reveal cross-user existence.
- Enforce ownership and category compatibility in both application logic and database constraints.
- Keep errors generic at the HTTP boundary and never log transaction payloads by default.
- Test unauthenticated access, cross-user references, incompatible category types, invalid money/dates, idempotent retry, and exclusion of soft-deleted rows.

## Consequences

- Balance arithmetic is deterministic: opening snapshot plus income minus expense over non-deleted transactions.
- Accidental or user-requested deletion remains recoverable from the database while disappearing from normal product behavior.
- Public contracts remain precise even for amounts beyond `Number.MAX_SAFE_INTEGER`.
- Duplicate-submit protection survives reloads and process restarts because it is a database invariant.
- A later restore, purge, audit log, merchant model, multi-timezone mode, or transfer feature requires a separate product decision and migration.

## Alternatives considered

### Signed transaction amounts

Rejected because carrying direction in both amount sign and `type` creates contradictory states and more validation branches.

### Hard delete

Rejected because transaction loss is difficult to reverse and removes the source record needed to explain a changed balance. The storage cost is negligible for the MVP.

### Browser-only duplicate prevention

Rejected because disabling a button cannot protect against retries, multiple tabs, or a response lost after a successful database commit.

### Server Actions for all transaction state

Deferred. Server Actions remain appropriate for server-rendered forms such as onboarding, but resource-shaped Route Handlers give TanStack Query stable authenticated read and mutation contracts without coupling reusable client state to a single form tree.

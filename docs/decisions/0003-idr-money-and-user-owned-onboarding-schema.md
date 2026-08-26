# ADR 0003: IDR Money and User-Owned Onboarding Schema

**Status:** Accepted
**Date:** 2026-08-27
**Decision owner:** Product owner

## Context

The first persisted onboarding slice needs exact money storage, an auditable opening-balance representation, consistent date semantics, and a clear ownership model for default categories. Leaving these choices implicit would make the first migration expensive to reverse and could allow finance records to lose precision or cross user boundaries.

ADR 0001 already establishes that onboarding records the account's current balance as an opening snapshot rather than an income transaction. This decision defines the database representation needed to preserve that invariant.

## Decision

For the MVP:

- Finara supports IDR as its single currency. Currency columns and conversion behavior are deferred until multi-currency support is explicitly specified.
- Money is stored as whole rupiah using PostgreSQL `BIGINT` and Prisma `BigInt`. Floating-point values are never persisted for financial amounts.
- Public JSON contracts will serialize money as base-10 strings because JavaScript `BigInt` is not JSON-serializable. Formatting and conversion belong at an explicit DTO boundary.
- `Account.openingBalance` stores the non-negative snapshot amount and `Account.openingBalanceAt` stores its UTC effective timestamp. A mutable `currentBalance` column is not stored.
- Created, updated, and snapshot timestamps use PostgreSQL `timestamptz`. A future `Transaction.transactionDate` uses a calendar date interpreted in `Asia/Jakarta` for the MVP; operational timestamps remain UTC.
- Default expense and income categories are copied into user-owned `Category` rows. There are no shared private category records.
- Persisted account types are `CASH`, `BANK`, and `E_WALLET`. Persisted category types are `INCOME` and `EXPENSE`.
- The initial migration contains only the domain ownership boundary (`User`), accounts, and categories. Authentication credentials, transactions, budgets, custom categories, and lifecycle fields remain outside this migration.

The database migration adds a check constraint requiring `openingBalance >= 0`. Application validation remains required at every future write boundary.

## Consequences

- IDR values round-trip exactly beyond JavaScript's safe-integer range.
- The current balance can later be derived from the opening snapshot and authorized transactions without fabricating activity.
- Every account and category has an explicit user foreign key, simplifying authorization queries and preventing global-category leakage.
- Multi-currency support will require a later migration and product specification.
- Editing or reconciling an opening snapshot still requires a separate behavior decision.
- The prototype's `EWALLET` identifier must be mapped to the persisted `E_WALLET` enum when the UI is connected to the backend.

## Alternatives considered

### PostgreSQL decimal money

Rejected for the IDR-only MVP because fractional rupiah values are invalid and an integer representation has a smaller arithmetic surface.

### JavaScript number storage

Rejected because values beyond `Number.MAX_SAFE_INTEGER` cannot round-trip exactly.

### Mutable stored current balance

Rejected because it duplicates transaction-derived state and creates reconciliation ambiguity.

### Global default categories

Rejected because mixed global/private ownership complicates authorization and category lifecycle rules.

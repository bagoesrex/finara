# ADR 0001: Current Balance as the Opening Snapshot

**Status:** Accepted  
**Date:** 2026-08-25  
**Decision owner:** Product owner

## Context

Finara needs one starting value before it can show a useful balance for a newly created financial account. The PRD left open whether onboarding should ask for an initial balance, whether that value should create an income transaction, and whether account balances should be stored or derived.

Creating an artificial income transaction would make the activity history and current-month income inaccurate. Omitting a starting value would require users to reconstruct their complete financial history before Home becomes useful.

## Decision

First-account onboarding asks for the account's **current balance** in IDR. The submitted amount is an opening snapshot as of account creation, not an `INCOME` transaction.

For the MVP balance invariant:

```text
current account balance = opening snapshot + income after snapshot - expenses after snapshot
```

- A current balance of `0` is valid.
- Negative and fractional IDR values are rejected in the current onboarding flow. Debt and overdraft behavior remain outside the MVP until explicitly specified.
- The snapshot does not appear in Activity and does not affect current-month income or spending.
- PostgreSQL persists the snapshot as an exact `BIGINT` amount with an effective timestamp, following [ADR 0003](./0003-idr-money-and-user-owned-onboarding-schema.md).

## Consequences

- New users reach a meaningful Home without fabricating financial activity.
- Monthly income and expense summaries remain based only on real transactions.
- The persisted account retains an auditable snapshot amount and effective timestamp without creating Activity history.
- Editing or reconciling an opening snapshot requires a separate specification before implementation.
- [ADR 0003](./0003-idr-money-and-user-owned-onboarding-schema.md) fixes IDR as the single MVP currency.

## Alternatives considered

### Create an opening income transaction

Rejected because it would inflate income and add misleading history.

### Start every account at zero

Rejected because Home would be misleading until the user recreated prior financial history.

### Store a mutable balance with no derivation rule

Rejected because it would make reconciliation and transaction-derived summaries ambiguous.

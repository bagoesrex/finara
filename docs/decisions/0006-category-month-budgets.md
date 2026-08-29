# ADR 0006: Category-Only Monthly Budgets

**Status:** Accepted
**Date:** 2026-08-29
**Decision owner:** Product owner

## Context

Finara's Budget page already presents monthly category allocations, but those
allocations are session-only and spending is reconstructed in the browser. The
MVP needs one PostgreSQL-backed calculation that can serve the page and later AI
questions without introducing rollover, forecasting, or spreadsheet behavior.

The PRD shows a monthly total followed by category allocations but leaves open
whether the total is stored independently, whether category is optional, how
period uniqueness works, and when a budget is nearly exhausted.

## Decision

For the MVP Budget lifecycle:

- A Budget is a user-owned allocation for exactly one `EXPENSE` category and one
  Jakarta calendar month. Total-only budgets and income-category budgets are not
  supported.
- Store the period as the first calendar day of the month in a PostgreSQL `DATE`.
  Public contracts use a `YYYY-MM` month key.
- Store `amount` as a strictly positive whole-rupiah PostgreSQL `BIGINT` and
  serialize every money value as a base-10 string at JSON boundaries.
- Enforce one allocation per user, category, and period. A retried create with
  the same natural key and amount returns the existing allocation; a different
  amount must use the allocation's update endpoint.
- The monthly allocated total is the sum of category allocations. It is not a
  second mutable field.
- Qualifying spending is the sum of non-deleted `EXPENSE` transactions whose
  category and Jakarta calendar month match the Budget.
- The server derives allocated, spent, remaining, status, and clamped visual
  progress. Status is `UNUSED`, `ON_TRACK`, `NEAR_LIMIT`, `LIMIT_REACHED`, or
  `OVER`; `NEAR_LIMIT` begins at 80 percent.
- Unused allocation does not roll over. Each month is an independent record.
- The MVP supports create and amount update. Delete, archive, copy-forward, and
  rollover behavior remain deferred because the PRD does not define them.
- Expose authenticated `GET`/`POST /api/budgets` and
  `PATCH /api/budgets/[id]` Route Handlers. The Budget Server Component reads
  the application service directly for initial TanStack Query hydration.
- Successful Budget mutations invalidate the affected monthly Budget query.
  Transaction mutations invalidate all cached Budget queries for the viewer so
  derived spending cannot remain stale.

## Threat model and integrity controls

### Assets

- Private allocation amounts and derived category spending.
- Category ownership and category-type relationships.
- Monthly totals later reused by AI answers.

### Trust boundaries

- Untrusted month keys, UUIDs, and money strings entering Route Handlers.
- The authenticated session identity entering Budget services.
- Precise database values crossing into browser JSON.

### Required controls

- Never accept a client-provided user ID for authorization.
- Validate all request bodies and query parameters before database access.
- Scope every read and update to the server-resolved session user.
- Enforce user/category/type ownership and natural-key uniqueness in PostgreSQL
  as well as application logic.
- Return the same not-found response for missing and cross-user IDs.
- Reuse the finance API's JSON size, media-type, and same-origin mutation checks.
- Test unauthenticated access, cross-user category and Budget IDs, income
  categories, duplicate creates, invalid periods, invalid money, and transaction
  inclusion/exclusion rules.

## Consequences

- Budget page totals and later AI Budget answers can share one server-side
  calculation.
- There is no conflicting total allocation to reconcile with category rows.
- Historical monthly allocations remain stable and independently queryable.
- Deletion and rollover require a later product decision rather than inheriting
  accidental behavior from the prototype.

## Alternatives considered

### Independent total monthly Budget

Rejected for the MVP because it can conflict with the sum of category rows and
requires rules for unallocated remainder that the PRD does not define.

### Optional category

Rejected because mixed total and category records complicate uniqueness and
make spending attribution ambiguous.

### Client-side spending calculation

Rejected because pagination can undercount transactions and AI answers would
not automatically share the same calculation.

### Automatic rollover

Deferred because it changes future allocations implicitly and has no settled
product behavior.

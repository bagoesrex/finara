# Spec: Data Model

**Status:** Accepted for MVP
**PRD source:** Sections 30-33

## Objective

Define the relational boundaries required for Finara's MVP without settling
future financial semantics silently. PostgreSQL is the source of truth and
Prisma is the selected ORM. IDR money, opening snapshots, timestamp semantics,
and category ownership are accepted by [ADR 0003](../decisions/0003-idr-money-and-user-owned-onboarding-schema.md).
Positive transaction amounts, optional local time, idempotent creation, and
soft deletion are accepted by [ADR 0005](../decisions/0005-positive-idr-transactions-and-soft-delete.md).
Category-only monthly Budget semantics are accepted by
[ADR 0006](../decisions/0006-category-month-budgets.md); destructive category
lifecycle remains deferred by ADR 0010.

## Core relationships

```text
User 1---* Account
User 1---* Transaction
User 1---* Category
User 1---* Budget

Account 1---* Transaction
Category 1---* Transaction
Category 1---* Budget
```

Default categories are copied into user-owned records, so `User 1---* Category` remains the authorization boundary.

## Entity requirements

### User

Required domain responsibilities:

- stable identity reference from the authentication system
- ownership boundary for all private finance records
- timestamps
- user-level preferences only when those preferences are implemented

Authentication credentials should remain owned by the selected authentication solution rather than duplicated without need.

### Account

Minimum proposed fields:

```text
id
userId
name
type: CASH | BANK | E_WALLET
openingBalance: whole IDR as BIGINT
openingBalanceAt: UTC timestamp
createdAt
updatedAt
```

Current balance is derived from the opening snapshot and authorized
transactions. It is not stored as a second mutable balance field. Archive
behavior is outside the accepted MVP.

### Category

Minimum proposed fields:

```text
id
userId
name
type: INCOME | EXPENSE
createdAt
updatedAt
```

If categories can be retired, an explicit archive field is preferred over deleting historical meaning.

### Transaction

PRD-required fields:

```text
id
userId
accountId
categoryId
type: INCOME | EXPENSE
amount: positive whole IDR as BIGINT
description: required trimmed text
transactionDate: Asia/Jakarta calendar date
transactionTime?: local wall-clock time
clientRequestId: UUID unique per user
deletedAt?: UTC timestamp
createdAt
updatedAt
```

Separate `note`, `merchant`, `timezone`, `currency`, and AI-provenance fields remain deferred.

### Budget

Minimum proposed responsibilities:

```text
id
userId
categoryId       // required user-owned EXPENSE category
periodStart      // first Jakarta calendar day of month
amount
createdAt
updatedAt
```

`categoryId` is required and must reference an `EXPENSE` category owned by the
same user. Actual spending, remaining amount, total allocation, status, and
progress are derived values and must not be duplicated as mutable Budget fields.

## Integrity requirements

- **DATA-001:** Every private record is associated with an owner directly or through a relation whose ownership is verified.
- **DATA-002:** A transaction's account belongs to the same user as the transaction.
- **DATA-003:** A transaction's category is accessible to that user and matches transaction type.
- **DATA-004:** Money uses an exact database representation and exact application arithmetic.
- **DATA-005:** Transaction date and creation timestamp remain distinct concepts.
- **DATA-006:** Foreign-key behavior preserves historical consistency when accounts or categories are retired.
- **DATA-007:** Budget period/category uniqueness prevents conflicting active allocations once the budget model is accepted.
- **DATA-008:** All mutations update timestamps consistently.

## Query and index requirements

The physical schema should support these user-scoped access paths:

- transactions by user and transaction date, newest first
- transactions by user, period, and type
- transactions by account
- transactions by category and period
- budgets by user and period
- search by user plus supported searchable fields

Index choices must be validated against real query plans after query shapes are implemented. Do not add a broad index for every column by default.

## Balance and summary rules

Balances and summaries are computed from authorized, non-deleted database data. Account balance begins with the non-negative opening snapshot, adds positive `INCOME` amounts, and subtracts positive `EXPENSE` amounts. Transfers are outside the MVP. Model arithmetic must live in tested server-side domain/application code, not React components or prompts.

## Phase 2 entities

The following are explicitly deferred and do not belong in the MVP schema without an approved feature spec:

- `FinancialGoal`
- `RecurringTransaction`
- `AIConversation`
- `AIInsight`

## Acceptance criteria

- The accepted Prisma schema can represent every MVP record without using unstructured AI output as financial state.
- Database and server validation prevent cross-user account/category references.
- The chosen money type round-trips values without precision loss.
- The required Activity, balance, monthly spending, search, and budget queries have deliberate access paths.
- The MVP exposes no destructive account/category lifecycle that can erase
  historical transaction meaning.
- Migrations are reviewable, reversible where practical, and tested against representative records.

## Deferred schema decisions and launch gate

- Custom categories, Budget/account/category lifecycle, restore/audit UI,
  merchant/note/provenance fields, and multi-timezone behavior are outside MVP.
- Permanent retention and deletion must be settled with the production privacy,
  backup, and account-deletion policy before destructive controls are added.
- Each future field or lifecycle changes the relational contract and therefore
  requires its own accepted migration decision.

See [ADR 0010](../decisions/0010-mvp-scope-closure-and-production-launch-gates.md).

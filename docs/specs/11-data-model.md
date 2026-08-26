# Spec: Data Model

**Status:** Draft  
**PRD source:** Sections 30-33

## Objective

Define the relational boundaries required for Finara's MVP without settling unresolved financial semantics silently. PostgreSQL is the source of truth and Prisma is the selected ORM direction. IDR money, opening snapshots, timestamp semantics, and category ownership are accepted by [ADR 0003](../decisions/0003-idr-money-and-user-owned-onboarding-schema.md); the document remains Draft while the remaining lifecycle and transaction questions are open.

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

Current balance is derived later from the opening snapshot and authorized transactions. It is not stored as a second mutable balance field. Archive behavior remains unresolved.

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
amount
description
transactionDate
createdAt
updatedAt
```

Potential fields such as `note`, `merchant`, `transactionTime`, `timezone`, `currency`, `deletedAt`, and AI provenance require explicit approval.

### Budget

Minimum proposed responsibilities:

```text
id
userId
categoryId?      // pending total-vs-category budget decision
period
amount
createdAt
updatedAt
```

Actual spending and remaining amount are derived values and should not be duplicated as mutable budget fields.

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

Balances and summaries are computed from authorized database data. Account balance begins with the non-negative opening snapshot; transaction effects will be finalized with the transfer decision. Model arithmetic must live in tested server-side domain/application code, not React components or prompts.

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
- Deactivating an account or category does not erase historical transaction meaning.
- Migrations are reviewable, reversible where practical, and tested against representative records.

## Open questions

- Custom categories in MVP.
- Soft delete and audit requirements.
- Transfer representation.
- Total budget versus category-only budgets and period uniqueness.
- Merchant, note, and AI provenance fields.
- Intra-day transaction time and natural-language semantics beyond the date-only MVP.

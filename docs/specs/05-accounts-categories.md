# Spec: Accounts and Categories

**Status:** Accepted for MVP
**PRD source:** Sections 30, 32-33, 43-44, 48

## Objective

Provide the minimum organization needed to assign every transaction to an account and category without turning setup into accounting configuration.

## Account requirements

- **ACCT-001:** Every transaction belongs to one account owned by the current user.
- **ACCT-002:** MVP account types include Cash, Bank, and E-Wallet.
- **ACCT-003:** Users can give accounts familiar names such as `Cash`, `BCA`, or `GoPay`.
- **ACCT-004:** First-time onboarding creates at least one usable account before transaction entry.
- **ACCT-005:** Account selectors show only accounts accessible to the current user.
- **ACCT-006:** Account configuration remains compact and avoids banking-specific fields that Finara does not use.
- **ACCT-012:** First-account onboarding records the account's current IDR balance as an opening snapshot and does not create an artificial income transaction, following [ADR 0001](../decisions/0001-current-balance-as-opening-snapshot.md).

## Default categories

Expense categories:

- Food & Drink
- Transport
- Shopping
- Bills
- Entertainment
- Health
- Education
- Other

Income categories:

- Salary
- Freelance
- Business
- Gift
- Other

Onboarding creates user-owned copies of these defaults following [ADR 0003](../decisions/0003-idr-money-and-user-owned-onboarding-schema.md). Default categories are not shared private records.

## Category requirements

- **ACCT-007:** Each category is valid for either income or expense so incompatible categories are not offered during entry.
- **ACCT-008:** Default categories are available to a new user without manual setup.
- **ACCT-009:** Category presentation uses consistent icon and text rather than a unique decorative treatment for every category.
- **ACCT-010:** Custom categories may be supported after the default experience is stable; if included in MVP, their ownership and lifecycle must be explicit.
- **ACCT-011:** AI category suggestions must resolve to a valid category available to the user before persistence.

## Management behavior

Account and category management is reached from Profile/Settings. The accepted
MVP operations are viewing the user-owned accounts/categories and renaming an
account. Create, archive, delete, reorder, and custom icon behavior are deferred.

Destructive actions must explain the effect on existing transactions before confirmation. Historical transactions must never become inaccessible merely because their account or category is no longer active.

### Current frontend boundary

Account type, current balance, transaction counts, and category options are now
read from the authenticated PostgreSQL-backed finance snapshot. Account balances
follow persisted transaction create, edit, and soft-delete operations through
TanStack Query invalidation.

Account rename is persisted through the authenticated server contract below.
Successful mutations invalidate the authoritative account and transaction
projections before the UI reports success. Default categories remain view-only
in the MVP.

## Persisted account rename contract

The first persisted account-management slice supports rename only. Create,
archive, delete, opening-balance edits, and account-type changes are not part of
this slice.

- **ACCT-013:** `PATCH /api/accounts/:id` accepts exactly `{ "name": string }`
  and returns the renamed account identity, normalized name, and update time.
- **ACCT-014:** Account names are trimmed, contain 1-40 characters, and are
  unique per user without case sensitivity. Changing only capitalization of the
  current account remains valid.
- **ACCT-015:** The server resolves ownership from the authenticated session;
  missing, malformed, and another user's account IDs all produce the same
  not-found behavior.
- **ACCT-016:** A successful rename is visible in account selectors and
  transaction projections after authoritative query invalidation. Transaction
  rows continue referencing the same `accountId`.
- **ACCT-017:** A failed rename leaves the sheet open with its input preserved,
  exposes a concise retryable error, and does not show a success message.

The duplicate check is enforced in the account application service under a
serializable transaction. No schema migration is required for this rename-only
slice; account creation must reuse or strengthen the same invariant before it
can be added.

## UI states

- Default categories loading and available.
- Account list empty, loading, populated, and failed.
- Account/category selector loading, empty, selected, and invalidated.
- Name validation and duplicate-name handling.

## Acceptance criteria

- A new user receives the documented default income and expense categories.
- A user can create or complete onboarding with a named Cash, Bank, or E-Wallet account.
- Transaction entry never exposes another user's account or private category.
- Income entry does not offer expense-only categories and vice versa.
- Existing transaction history remains understandable after an account rename;
  the MVP exposes no account/category destructive lifecycle.
- AI output cannot persist an unknown category identifier.

## Deferred lifecycle

- Custom categories follow the PRD's later boundary and are not part of MVP.
- Opening-balance editing, account/category archive or delete, and historical
  reconciliation require a separate lifecycle decision.
- Duplicate category naming is deferred with category creation; the MVP creates
  one known user-owned default set and does not expose category rename/create.

See [ADR 0011](../decisions/0011-portfolio-mvp-as-the-acceptance-boundary.md).

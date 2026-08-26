# Spec: Accounts and Categories

**Status:** Draft  
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

Account and category management is reached from Profile/Settings. The minimum useful operations are view and rename. Create, archive, delete, reorder, and custom icon behavior remain subject to the open questions below.

Destructive actions must explain the effect on existing transactions before confirmation. Historical transactions must never become inaccessible merely because their account or category is no longer active.

### Frontend prototype boundary

The dummy-data frontend currently supports viewing account type and current balance, plus renaming an account. An in-session rename updates the account selector and existing dummy transaction references so the prototype remains understandable. Account balances also follow in-session transaction create, edit, and delete actions.

Default categories are view-only until category ownership and lifecycle are decided. The prototype trims account names, limits them to 40 characters, and rejects case-insensitive duplicates as a temporary UI safety guard. These constraints do not settle the backend duplicate-name or case-sensitivity policy listed under open questions.

## UI states

- Default categories loading and available.
- Account list empty, loading, populated, and failed.
- Account/category selector loading, empty, selected, and invalidated.
- Name validation and duplicate-name handling.
- Attempt to remove an account/category referenced by transactions.

## Acceptance criteria

- A new user receives the documented default income and expense categories.
- A user can create or complete onboarding with a named Cash, Bank, or E-Wallet account.
- Transaction entry never exposes another user's account or private category.
- Income entry does not offer expense-only categories and vice versa.
- Existing transaction history remains understandable after an account or category is renamed or made inactive.
- AI output cannot persist an unknown category identifier.

## Open questions

- Whether custom categories are MVP or Phase 2.
- Editing and reconciliation lifecycle for the opening-balance snapshot.
- Archive versus hard-delete behavior for accounts and categories.
- Duplicate account/category names and case sensitivity.

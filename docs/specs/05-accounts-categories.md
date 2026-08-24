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

## Category requirements

- **ACCT-007:** Each category is valid for either income or expense so incompatible categories are not offered during entry.
- **ACCT-008:** Default categories are available to a new user without manual setup.
- **ACCT-009:** Category presentation uses consistent icon and text rather than a unique decorative treatment for every category.
- **ACCT-010:** Custom categories may be supported after the default experience is stable; if included in MVP, their ownership and lifecycle must be explicit.
- **ACCT-011:** AI category suggestions must resolve to a valid category available to the user before persistence.

## Management behavior

Account and category management is reached from Profile/Settings. The minimum useful operations are view and rename. Create, archive, delete, reorder, and custom icon behavior remain subject to the open questions below.

Destructive actions must explain the effect on existing transactions before confirmation. Historical transactions must never become inaccessible merely because their account or category is no longer active.

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

- Whether default categories are global records or copied per user.
- Whether custom categories are MVP or Phase 2.
- Account initial-balance semantics and whether balance is stored or derived.
- Archive versus hard-delete behavior for accounts and categories.
- Duplicate account/category names and case sensitivity.
- Whether an account has one currency or inherits a user-wide currency.

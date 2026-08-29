# Spec: Budget

**Status:** Accepted for MVP
**PRD source:** Sections 23-24, 26

The persistence and calculation decisions in this spec follow
[ADR 0006](../decisions/0006-category-month-budgets.md).

## Objective

Help users understand how much of a monthly spending limit has been used and what remains, using simple progress rather than spreadsheet-like planning.

## Requirements

- **BUD-001:** Budget information has an explicit month and year context.
- **BUD-002:** The primary summary shows the budget amount and qualifying expense amount spent in that period.
- **BUD-003:** Category budget rows show category, allocated amount, spent amount, and simple progress.
- **BUD-004:** Spending is derived from persisted expense transactions in the matching category and period.
- **BUD-005:** Income does not count toward budget consumption.
- **BUD-006:** Progress remains understandable when spending reaches or exceeds the allocation.
- **BUD-007:** Users can create or change an allocation without editing a spreadsheet-like grid.
- **BUD-008:** AI budget answers use the same server-side budget calculations as the Budget page.
- **BUD-009:** Every MVP Budget references one user-owned expense category.
- **BUD-010:** The displayed monthly total is the sum of category allocations, not an independent mutable value.
- **BUD-011:** An allocation is unique per user, category, and Jakarta calendar month.
- **BUD-012:** Unused allocation does not roll over automatically.

## Calculation behavior

For a category allocation:

```text
spent = sum(qualifying EXPENSE transactions in category and period)
remaining = allocation - spent
progress = spent / allocation
```

Presentation may clamp the visual progress bar while still displaying the true overspent amount. Zero or missing allocations must not cause division errors.

`near-limit` begins at 80 percent. All allocation, spending, remaining, status,
and progress calculations are produced by the authenticated server application
service. Public money fields are decimal strings.

## API contract

- `GET /api/budgets?month=YYYY-MM` returns the authorized monthly overview.
- `POST /api/budgets` creates a category allocation and is idempotent when the
  same user/category/month/amount is retried.
- `PATCH /api/budgets/:id` changes only the allocation amount.
- Missing and cross-user Budget IDs are both returned as not found.
- Delete remains outside the accepted MVP behavior.

## UI states

- No budget configured for the period.
- Budget configured with no spending.
- Spending within allocation.
- Allocation nearly exhausted.
- Overspent.
- Loading and calculation failure.

## Insight behavior

Budget insight is short, data-backed, and actionable, for example:

```text
Kamu masih punya Rp580 rb untuk budget Food bulan ini.
```

It must not shame the user or recommend unrelated financial products.

## Acceptance criteria

- A user can see monthly allocation, spent amount, and remaining amount without interpreting a table.
- Adding, editing, or deleting a qualifying expense updates the corresponding budget progress.
- Income and transactions outside the period do not alter the result.
- Overspending produces a clear state and a correct negative remaining amount or explicit overage.
- Budget values on the page and in AI answers are calculated from the same source of truth.
- Users cannot access or modify another user's budgets.

## Open questions

- Delete, archive, or replacement behavior when a user no longer wants an allocation.
- Whether a future total-only planning mode should coexist with category allocations.
- Multi-timezone behavior beyond the single Jakarta-calendar MVP.

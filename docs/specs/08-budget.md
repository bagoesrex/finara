# Spec: Budget

**Status:** Draft  
**PRD source:** Sections 23-24, 26

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

## Calculation behavior

For a category allocation:

```text
spent = sum(qualifying EXPENSE transactions in category and period)
remaining = allocation - spent
progress = spent / allocation
```

Presentation may clamp the visual progress bar while still displaying the true overspent amount. Zero or missing allocations must not cause division errors.

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

- Whether total monthly budget is an independent value or the sum of category allocations.
- Whether every budget must reference a category.
- Budget uniqueness and rollover rules across periods.
- How timezone determines month boundaries.
- Whether unused budget carries into the next month; no rollover is currently specified.
- Which warning threshold constitutes `nearly exhausted`.

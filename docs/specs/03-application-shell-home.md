# Spec: Application Shell and Home

**Status:** Accepted for MVP
**PRD source:** Sections 6, 13-16, 42, 48-50, 53-54

## Objective

Home must communicate the user's current financial state in under five seconds and provide the shortest path to recording a transaction.

## Information architecture

Primary navigation contains at most four destinations:

1. Home
2. Activity
3. Budget
4. Profile

The AI composer belongs to the Home interaction model and is not a separate generic chat destination.

## Shell requirements

- **SHELL-001:** Primary pages use a shared centered mobile container and persistent bottom navigation.
- **SHELL-002:** The active destination is clear without oversized floating navigation or decorative effects.
- **SHELL-003:** Page content reserves enough bottom space to remain visible above navigation and device safe areas.
- **SHELL-004:** Detail, edit, and short onboarding screens may replace persistent navigation when it would distract from the focused flow.
- **SHELL-005:** Desktop enhancements are limited to background treatment, hover states, and optional keyboard shortcuts.

## Home hierarchy

Home presents information in this order:

1. Compact brand/header and profile access.
2. Available balance.
3. Current-month spending.
4. AI composer / quick transaction input.
5. Recent transactions.
6. A lightweight link to the complete Activity view.

Additional analytics must not displace these priorities.

## Home requirements

- **SHELL-006:** Available balance is the strongest numerical element and does not require a decorative card.
- **SHELL-007:** Current-month spending has a clear period context.
- **SHELL-008:** The composer uses a short contextual placeholder such as `Catat sesuatu...` or `Makan 25rb...`.
- **SHELL-009:** Submitting transaction-like text starts AI parsing and produces a confirmation preview rather than silently saving.
- **SHELL-010:** Recent activity shows description, signed amount, and enough date context to understand the entry.
- **SHELL-011:** Home updates after a transaction is saved without requiring a full manual refresh.
- **SHELL-012:** When there are no transactions, Home shows a concise example that teaches natural-language entry.

## Primary flows

### Returning user

```text
Open Home -> understand balance/spending -> optionally record or inspect activity
```

### First AI transaction

```text
Enter "makan ayam 25rb" -> parse -> preview -> save -> Home values and recent list update
```

### Parse failure

```text
Enter ambiguous text -> show what is missing -> preserve original input -> allow correction
```

## UI states

- Loading financial summary.
- Empty account/transaction data.
- Populated summary.
- Composer idle, submitting, parsed, ambiguous, and failed.
- Save in progress, success, and failure.
- Partial data failure where recent activity fails but balance remains usable, or vice versa.

## Acceptance criteria

- Home exposes available balance, monthly spending, composer, and recent transactions without scrolling on a representative modern mobile viewport when practical.
- A user can focus the composer and submit with touch or keyboard.
- No transaction is persisted before the MVP confirmation action.
- Successful save updates every affected Home summary consistently.
- A failed parse or save does not discard the user's original input.
- Bottom navigation does not obscure the last item or composer at supported viewport sizes.

## Accepted MVP presentation

- `Available` aggregates the opening snapshots and non-deleted transactions of
  every usable account owned by the current user.
- Recent shows the four newest transactions; Activity provides complete history.
- The composer is inline on Home. Its transaction result opens a focused
  confirmation sheet.
- Home shows both current-month spending and current-month income below the
  primary available balance.

These choices preserve the PRD hierarchy and are recorded by
[ADR 0011](../decisions/0011-portfolio-mvp-as-the-acceptance-boundary.md).

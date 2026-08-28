# Spec: Transaction Lifecycle

**Status:** Draft  
**PRD source:** Sections 14, 17-18, 21-22, 38, 48

## Objective

Let users create, confirm, edit, and delete income or expense records quickly while keeping persisted financial data accurate and reviewable.

## Transaction contract

A transaction minimally identifies:

- owner
- account
- category
- type: `INCOME` or `EXPENSE`
- amount
- description
- transaction date
- created and updated timestamps

The accepted storage and lifecycle semantics are defined by [ADR 0005](../decisions/0005-positive-idr-transactions-and-soft-delete.md). Time remains optional and description is the single MVP free-text field.

## Manual entry requirements

- **TXN-001:** The minimal form contains amount, income/expense type, category, optional note, and a submit action.
- **TXN-002:** Transaction date defaults to today and remains hidden or compact until the user chooses to change it.
- **TXN-003:** Account selection defaults only when a deterministic active account is available; otherwise the user must choose.
- **TXN-004:** Amount, type, account, category, and transaction date are validated on the server before persistence.
- **TXN-005:** The selected category must be compatible with transaction type.

## AI entry requirements

- **TXN-006:** Natural-language entry may extract type, amount, description, category, date, and relevant time.
- **TXN-007:** Parsed data is shown in a compact preview before the MVP save action.
- **TXN-008:** The user can cancel or correct a preview without creating a transaction.
- **TXN-009:** Auto-save based on model confidence is not enabled in MVP.
- **TXN-010:** The server revalidates confirmed AI output exactly as it validates manual input.

## Save behavior

- **TXN-011:** A successful save creates exactly one transaction and returns its persisted representation.
- **TXN-012:** Repeated submission caused by a pending UI must not create unintended duplicates.
- **TXN-013:** Home balance, monthly spending, recent activity, Activity history, and related budget progress reflect the saved record consistently.
- **TXN-014:** A failed save preserves the user's input and provides a recoverable retry path.

## Edit and delete

- **TXN-015:** The owner can edit relevant transaction fields from the transaction-detail flow.
- **TXN-016:** Editing revalidates account/category ownership and category/type compatibility.
- **TXN-017:** Delete is explicitly confirmed and updates all derived summaries.
- **TXN-018:** Users cannot read, edit, or delete transactions they do not own.

## Amount presentation

- Income and expense direction is always visible through sign, label, or semantic context—not color alone.
- Display formatting follows the active locale and currency decision.
- Calculations use precise money representations and never binary floating-point values.

## Acceptance criteria

- Manual entry can save valid income and expense transactions.
- The example `makan ayam 25rb` produces an editable preview containing expense type, `Rp25.000`, a food category, and the appropriate date context.
- Nothing is persisted when the preview is cancelled.
- Invalid amount, inaccessible account, incompatible category, and invalid date are rejected server-side.
- Save, edit, and delete each update every affected financial summary.
- A retry or rapid repeated tap does not unintentionally create duplicate transactions.

## Open questions

- Restore UX and permanent-retention policy for soft-deleted transactions.
- Whether merchant, note, and AI provenance become separate post-MVP fields.
- Transfer semantics if transfers enter product scope after the MVP.

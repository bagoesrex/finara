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

Time and note are displayed or collected only when relevant. Their persistence shape is defined in the data-model spec.

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

- Whether amount is stored as an integer minor unit or database decimal.
- Whether amount is always positive with direction represented by `type`.
- Exact time and timezone semantics for natural-language phrases such as `tadi pagi`.
- Whether merchant, description, and note are separate fields.
- Soft delete, audit history, and undo behavior.
- Transfer support between accounts; it is not currently part of the PRD transaction types.

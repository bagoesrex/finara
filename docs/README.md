# Finara Documentation

Dokumentasi Finara dibagi menjadi dua lapisan:

1. [`PRD.md`](./PRD.md) adalah sumber utama untuk visi, scope, dan prinsip produk.
2. [`specs/`](./specs/) menerjemahkan PRD menjadi requirement implementasi dan acceptance criteria per domain.
3. [`decisions/`](./decisions/) mencatat keputusan produk dan arsitektur yang menyelesaikan pertanyaan terbuka secara eksplisit.

Jika spec turunan bertentangan dengan PRD, PRD berlaku sampai keputusan baru dicatat secara eksplisit. Item berlabel **Open question** belum menjadi keputusan implementasi.

## Spec index

| Area | Dokumen | Requirement ID |
| --- | --- | --- |
| Visi, pengguna, scope | [`01-product-scope.md`](./specs/01-product-scope.md) | `PROD-*` |
| Design system dan interaction | [`02-experience-design.md`](./specs/02-experience-design.md) | `UX-*` |
| Navigation, shell, dan Home | [`03-application-shell-home.md`](./specs/03-application-shell-home.md) | `SHELL-*` |
| Authentication dan onboarding | [`04-authentication-onboarding.md`](./specs/04-authentication-onboarding.md) | `AUTH-*` |
| Account dan category | [`05-accounts-categories.md`](./specs/05-accounts-categories.md) | `ACCT-*` |
| Transaction lifecycle | [`06-transactions.md`](./specs/06-transactions.md) | `TXN-*` |
| Activity, search, dan detail | [`07-activity-search.md`](./specs/07-activity-search.md) | `ACT-*` |
| Budget | [`08-budget.md`](./specs/08-budget.md) | `BUD-*` |
| AI parsing, query, dan insight | [`09-ai-assistant.md`](./specs/09-ai-assistant.md) | `AI-*` |
| Profile dan settings | [`10-profile-settings.md`](./specs/10-profile-settings.md) | `PROF-*` |
| Database dan domain model | [`11-data-model.md`](./specs/11-data-model.md) | `DATA-*` |
| Architecture, security, privacy | [`12-architecture-security.md`](./specs/12-architecture-security.md) | `ARCH-*` |
| Quality dan success metrics | [`13-quality-success.md`](./specs/13-quality-success.md) | `QUAL-*` |

## PRD coverage

| PRD section | Covered by |
| --- | --- |
| 1-4, 45-47, 59-60 | Product scope |
| 5, 7-12, 34-41, 49-53 | Experience design |
| 6, 13-16, 42, 48-50, 53-54 | Application shell and Home |
| 43-45, 48, 57 | Authentication and onboarding |
| 30, 32-33, 43-44, 48 | Accounts and categories |
| 14, 17-18, 21-22, 38, 48 | Transactions |
| 19-21 | Activity and search |
| 23-24, 26 | Budget |
| 15-18, 24-29, 54-56 | AI assistant |
| 43-44 | Profile and settings |
| 30-33 | Data model |
| 27-29, 51, 56-57 | Architecture and security |
| 34-36, 58 | Quality and success |

## Status convention

- **Draft**: derived from the PRD and ready for review, but unresolved questions remain.
- **Accepted**: explicitly approved and safe to implement.
- **Superseded**: replaced by a newer spec or ADR.

All specs start as **Draft**. A feature should not silently resolve its open questions during implementation.

## Decision index

| ID | Keputusan | Status |
| --- | --- | --- |
| [`ADR 0001`](./decisions/0001-current-balance-as-opening-snapshot.md) | Saldo saat ini menjadi snapshot pembuka, bukan transaksi pemasukan | Accepted |
| [`ADR 0002`](./decisions/0002-tanstack-query-for-client-finance-state.md) | TanStack Query mengelola mutable client server-state selama sesi private app | Accepted |
| [`ADR 0003`](./decisions/0003-idr-money-and-user-owned-onboarding-schema.md) | Uang MVP memakai IDR utuh, opening snapshot, dan category milik user | Accepted |

# Implementation Plan: PostgreSQL Foundation and First Persisted Slice

## Overview

Establish a verified, server-only PostgreSQL foundation, complete persisted onboarding, and replace prototype transaction state with an authorized PostgreSQL/TanStack Query vertical slice.

## Architecture decisions

- Use Prisma ORM 7.10.0 with the PostgreSQL driver adapter. Prisma 7 remains supported, has an official Next.js integration guide, and matches the repository's accepted Prisma Schema Language direction.
- Keep `DATABASE_URL` in an ignored root environment file. Commit only a placeholder example and never expose the value through a `NEXT_PUBLIC_` variable.
- Put the Prisma client behind a `server-only` module and reuse one development instance to avoid hot-reload connection churn.
- Generate the Prisma client before build and type checking; generated source is reproducible and excluded from Git and lint.
- Create domain tables only after money, opening-balance representation, timezone, and category ownership decisions are accepted and recorded.
- Use Better Auth 1.7.2 with email/password, PostgreSQL-backed opaque sessions, database rate limiting, and server-side ownership checks following ADR 0004.
- Do not expose financial endpoints until the selected authentication/session implementation is verified.
- Use authenticated Route Handlers for transaction resource contracts while Server Components call application services directly for initial query hydration.
- Use positive whole-rupiah transaction amounts, database-backed idempotency, and soft deletion following ADR 0005.

## Task list

### Phase 1: Database foundation

- [x] Task 1: Add the pinned Prisma/PostgreSQL toolchain and safe environment conventions.
- [x] Task 2: Add an empty PostgreSQL Prisma schema, CLI configuration, and server-only client factory.
- [x] Task 3: Prove the configured database connection with a read-only query.

### Checkpoint: Connection

- [x] Prisma schema validation and client generation pass.
- [x] A read-only `SELECT 1` succeeds against local `finara_db`.
- [x] Git does not track or reveal the local database credential.
- [x] Existing tests, lint, type checking, and production build pass.

### Phase 2: Domain decision gate

- [x] Task 4: Propose and obtain approval for money, currency, opening snapshot, timezone, and category ownership semantics.
- [x] Task 5: Record accepted decisions and create the first reviewable migration.

### Checkpoint: Schema

- [x] The migration represents only accepted MVP entities and invariants.
- [x] Exact money round-tripping and the opening-balance constraint have an integration check.

### Phase 3: Persisted onboarding vertical slice

- [x] Task 6: Select, implement, and verify the authentication/session foundation.
- [x] Task 7: Persist authenticated user and first-account onboarding through a server-only application service.
- [x] Task 8: Read the authoritative account snapshot on Home.

### Checkpoint: Onboarding

- [x] Private data cannot be read without a valid server session.
- [x] Returning initialized users skip onboarding.
- [x] Opening balance is a snapshot and creates no artificial income transaction.

### Phase 4: Persisted transaction lifecycle

- [x] Task 9: Add the accepted transaction schema, migration, constraints, and database integration checks.
- [x] Task 10: Add typed, authenticated transaction list/create/detail/update/delete contracts and application services.
- [x] Task 11: Hydrate TanStack Query from Server Components and replace prototype transaction list/create state.
- [x] Task 12: Persist edit and soft delete, then invalidate all affected authoritative query resources.

### Checkpoint: Complete

- [x] Creating a transaction updates affected pages without a browser reload.
- [x] PostgreSQL remains authoritative and every financial operation is user-scoped on the server.

### Phase 5: Persisted monthly category budgets

- [ ] Task 13: Record category-only monthly Budget semantics and add the constrained Prisma model.
- [ ] Task 14: Add precise Budget contracts and a server-side monthly calculation service.
- [ ] Task 15: Expose authenticated Budget list/create/update Route Handlers with abuse-case checks.
- [ ] Task 16: Hydrate the Budget route and replace session-only allocation state with TanStack Query mutations.

### Checkpoint: Persisted Budget

- [ ] Budget allocation and derived spending survive reloads and remain user-scoped.
- [ ] Transaction changes invalidate Budget calculations without client-side financial reconciliation.
- [ ] Focused tests, runtime flows, lint, type checking, and production build pass.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Local database password enters Git history | High | Store it only in ignored `.env`; commit a placeholder example and run secret-diff checks. |
| Schema encodes unresolved product behavior | High | Require an accepted domain decision checkpoint before each migration. |
| Database code leaks into Client Components | High | Mark the client factory `server-only` and expose narrow DTOs through a later DAL. |
| Prisma client connections multiply during hot reload | Medium | Cache one development client instance on `globalThis`. |
| Prototype UI is partially backed by real data | Medium | Migrate one complete authenticated vertical slice at a time. |

## Open questions

- Restore and permanent-retention behavior for soft-deleted transactions; neither is required by the current MVP.
- Delete/archive behavior for Budget allocations; create and amount update are the accepted MVP operations.

## Verification notes

- Prisma Client and the PostgreSQL adapter completed a read-only identity and `SELECT 1` check against the configured local database.
- Migration `20260826193516_init_onboarding` creates only `User`, `Account`, and `Category`, including user ownership, exact `BIGINT` opening balances, timezone-aware timestamps, and a nonnegative opening-balance database constraint.
- The onboarding schema integration check round-trips a value above JavaScript's safe-integer limit and confirms PostgreSQL rejects a negative opening balance, then removes all temporary rows.
- Migration `20260828120000_add_better_auth` extends the existing user boundary and adds isolated credential, session, verification, and rate-limit tables. Existing development users receive unique non-deliverable placeholder identities instead of being deleted.
- The auth integration check verifies registration without email enumeration, non-plaintext credential storage, database-session resolution and immediate sign-out revocation, generic login failures, and three-attempt login and registration rate limits, then removes all synthetic rows.
- Client IP headers remain deployment-specific: Finara accepts a configured single-value header only when a trusted reverse proxy overwrites it; otherwise Better Auth uses its safe fallback behavior.
- The Prisma CLI currently brings `deepmerge-ts` 7.1.5 through `@prisma/config`. npm reports GHSA-ggr8-5vv4-36mx as high severity; this path is dev-optional, receives only repository-controlled Prisma configuration, and is not bundled into the application runtime. npm offers only an incompatible Prisma 6.12 downgrade, while Prisma 8 is still a release candidate in the registry as of this increment.
- The restricted Windows sandbox causes Node `os.userInfo()` to fail before `tsx` starts. Database verification here used a process-only test preloader to supply a stable sandbox user ID; the committed project scripts remain standard and need no workaround in a normal shell.
- Migrations `20260828150239_add_transactions` and `20260828150500_add_transaction_checks` add exact positive-IDR transactions, database-enforced same-user account/category references, category/type compatibility, per-user create idempotency, optional Jakarta local time, and soft deletion. `npm run db:test:transactions` verifies precision and every integrity boundary without leaving synthetic rows.
- Transaction Route Handlers expose precise string-money DTOs for snapshot, cursor-paginated list, create, detail, edit, and soft delete. Service and HTTP checks cover malformed/oversized input, non-JSON and cross-origin mutations, invalid references, mismatched category types, cross-user access, idempotent retry/conflict, summary changes, and tombstone exclusion.
- The development Prisma singleton now replaces a generated client that predates the `Transaction` delegate. This keeps `next dev` hot reload usable after an additive schema generation while preserving the normal single-client behavior.
- The private app now server-prefetches viewer-scoped snapshot and transaction-list queries, dehydrates string-money DTOs, and uses authenticated browser query functions after hydration. Successful create, edit, and soft-delete mutations await snapshot, list, and affected-detail invalidation before the UI reports success.
- Mock finance fixtures and their migration adapter were removed. Home, Activity, transaction detail, Profile account counts, and finance settings now read persisted account/category/transaction projections; the UI explicitly labels account rename and budgets as session-only until their own persisted slices are implemented.
- `npm test` passes 67 tests; lint, type checking, and the Next.js production build pass. PostgreSQL schema/service checks and the production HTTP smoke flow pass, including authenticated SSR hydration on Home and Activity, cross-user denial, idempotent create, edit, soft delete, and summary reconciliation.
- Chrome DevTools MCP was not available in this environment, so the no-reload behavior is covered by focused query invalidation tests and the production HTTP hydration smoke rather than an automated real-browser interaction.

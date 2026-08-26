# Implementation Plan: PostgreSQL Foundation and First Persisted Slice

## Overview

Establish a verified, server-only PostgreSQL connection for Finara before replacing prototype finance data. The first increment configures Prisma ORM against the user's local `finara_db` without creating financial tables. Schema semantics and authentication remain explicit checkpoints before persisted onboarding or transaction APIs are exposed.

## Architecture decisions

- Use Prisma ORM 7.10.0 with the PostgreSQL driver adapter. Prisma 7 remains supported, has an official Next.js integration guide, and matches the repository's accepted Prisma Schema Language direction.
- Keep `DATABASE_URL` in an ignored root environment file. Commit only a placeholder example and never expose the value through a `NEXT_PUBLIC_` variable.
- Put the Prisma client behind a `server-only` module and reuse one development instance to avoid hot-reload connection churn.
- Generate the Prisma client before build and type checking; generated source is reproducible and excluded from Git and lint.
- Do not create domain tables until money, opening-balance representation, timezone, and category ownership decisions are accepted.
- Do not expose financial endpoints until a real server-side authentication/session implementation is selected.

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

- [ ] Task 4: Propose and obtain approval for money, currency, opening snapshot, timezone, and category ownership semantics.
- [ ] Task 5: Record accepted decisions and create the first reviewable migration.

### Checkpoint: Schema

- [ ] The migration represents only accepted MVP entities and invariants.
- [ ] Exact money round-tripping and opening-balance calculations have tests.

### Phase 3: Persisted onboarding vertical slice

- [ ] Task 6: Select and document authentication/session implementation.
- [ ] Task 7: Persist authenticated user and first-account onboarding through a server-only application service.
- [ ] Task 8: Read the authoritative account snapshot on Home.

### Checkpoint: Onboarding

- [ ] Private data cannot be read without a valid server session.
- [ ] Returning initialized users skip onboarding.
- [ ] Opening balance is a snapshot and creates no artificial income transaction.

### Phase 4: First TanStack Query resource

- [ ] Task 9: Add authenticated transaction list and create contracts.
- [ ] Task 10: Replace the prototype snapshot adapter with transaction resource queries and authoritative mutation invalidation.

### Checkpoint: Complete

- [ ] Creating a transaction updates affected pages without a browser reload.
- [ ] PostgreSQL remains authoritative and every financial operation is user-scoped on the server.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Local database password enters Git history | High | Store it only in ignored `.env`; commit a placeholder example and run secret-diff checks. |
| Schema encodes unresolved product behavior | High | Keep the initial schema model-free and require the domain decision checkpoint before migration. |
| Database code leaks into Client Components | High | Mark the client factory `server-only` and expose narrow DTOs through a later DAL. |
| Prisma client connections multiply during hot reload | Medium | Cache one development client instance on `globalThis`. |
| Prototype UI is partially backed by real data | Medium | Migrate one complete authenticated vertical slice at a time. |

## Open questions

- Authentication provider and session strategy.
- Exact money, currency, opening snapshot, timezone, and category ownership semantics.
- Mutation transport choice after authentication: Route Handlers, Server Actions, or a deliberate mix.

## Verification notes

- Prisma Client and the PostgreSQL adapter completed a read-only identity and `SELECT 1` check against the configured local database.
- The Prisma CLI currently brings `deepmerge-ts` 7.1.5 through `@prisma/config`. npm reports GHSA-ggr8-5vv4-36mx as high severity; this path is dev-optional, receives only repository-controlled Prisma configuration, and is not bundled into the application runtime. npm offers only an incompatible Prisma 6.12 downgrade, while Prisma 8 is still a release candidate in the registry as of this increment.
- The restricted Windows sandbox causes Node `os.userInfo()` to fail before `tsx` starts. The read-only runtime connection check succeeds outside that sandbox; application quality commands succeed inside it.

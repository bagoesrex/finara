# TanStack Query Finance State Tasks

- [x] Record ADR 0002 and update the decision index.
  - Acceptance: client cache ownership, session isolation, RSC interaction, and security constraints are explicit.
  - Verify: documentation matches the implemented provider boundary.

- [x] Define the prototype finance query contract with a failing test first.
  - Acceptance: the query key is stable, finance-specific, and scoped to the active prototype identity.
  - Verify: focused Vitest test demonstrates RED then GREEN.

- [ ] Add the in-memory Query Client boundary.
  - Acceptance: one client survives private route navigation and is destroyed when the private app unmounts.
  - Verify: typecheck and production build pass.

- [ ] Migrate shared mock finance state to TanStack Query.
  - Acceptance: existing pages keep using `useMockFinance`; transaction, budget, and account mutations update the shared cache atomically.
  - Verify: existing unit tests plus browser create/edit/delete/rename navigation checks.

- [ ] Complete quality and security gates.
  - Acceptance: tests, lint, typecheck, build, dependency audit, and final review pass.
  - Verify: repository commands and real-browser inspection.

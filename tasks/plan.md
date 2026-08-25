# Implementation Plan: TanStack Query Finance State

## Overview

Move the prototype's shared finance state from React component state into an in-memory TanStack Query cache without changing the existing Home, Activity, Budget, or Profile consumer contract. This establishes the client server-state boundary that a later authenticated API can replace while PostgreSQL remains the eventual source of truth.

## Architecture decisions

- Mount one Query Client inside the authenticated private-app boundary so it survives route navigation but is discarded on sign-out.
- Keep the existing `useMockFinance` interface during the prototype migration; page components should not know whether data comes from mock state or an API.
- Scope prototype finance query keys to the active session identity to prevent cache reuse between users.
- Keep financial query data in memory only. Do not persist it to browser storage.
- Use a single atomic finance snapshot for the mock adapter. Split it into resource queries when real API read contracts are introduced.
- Preserve Server Components for route shells. A future backend may prefetch and hydrate TanStack Query, but must not render a second independently revalidated copy of the same mutable data.

## Task list

### Phase 1: Decision and contract

- [x] Task 1: Record the TanStack Query client-state decision in ADR 0002.
- [x] Task 2: Define and test the session-scoped prototype query key and cache-update contract.

### Checkpoint: Contract

- [x] The decision explains ownership, session isolation, invalidation, and the RSC boundary.
- [x] Focused tests fail before and pass after the new cache contract exists.

### Phase 2: Prototype migration

- [ ] Task 3: Install TanStack Query and add a private-app Query Client provider.
- [ ] Task 4: Migrate `MockFinanceProvider` from `useState` to the Query Client without changing page consumers.

### Checkpoint: Migration

- [ ] Transaction, budget, and account changes remain visible across client-side route navigation.
- [ ] Signing out unmounts the Query Client and discards the prior session cache.

### Phase 3: Verification

- [ ] Task 5: Run tests, lint, typecheck, build, dependency audit, and browser runtime checks.
- [ ] Task 6: Review the final diff for correctness, security, maintainability, and scope.

### Checkpoint: Complete

- [ ] All quality gates pass.
- [ ] No financial data is persisted in browser storage.
- [ ] The repository is ready for the later API/database slice.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Query cache is mistaken for authoritative financial storage | High | Keep the adapter explicitly prototype-only and document PostgreSQL/server validation as authoritative. |
| Data leaks between prototype identities | High | Scope keys to the identity and own the Query Client inside the private session boundary. |
| Server and client render separate stale copies | Medium | Treat Server Components as prefetchers for mutable query-owned data when the backend arrives. |
| Migration changes page behavior | Medium | Preserve the existing provider interface and verify the current flows in a real browser. |

## Open questions deferred

- Real API mutation style remains open until authentication and backend contracts are selected.
- Resource-level query keys, pagination, and server hydration will be finalized with the first persisted transaction slice.
- Cross-tab or cross-device realtime synchronization is outside this prototype migration.

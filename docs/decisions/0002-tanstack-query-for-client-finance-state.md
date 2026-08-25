# ADR 0002: TanStack Query for Client Finance State

**Status:** Accepted

**Date:** 2026-08-26

**Decision owner:** Product owner

## Context

Home, Activity, Budget, and finance settings show different projections of the same financial records. A transaction create, edit, or delete can change the activity list, account balances, monthly summaries, and budget progress. Requiring a browser reload or maintaining unrelated component copies would make those views inconsistent and complicate the later PostgreSQL integration.

Next.js Server Components can load and stream initial data, while TanStack Query provides client-side server-state caching, mutation state, and targeted invalidation. Using both without a clear owner can also produce two independently revalidated versions of the same financial value.

## Decision

Finara will use TanStack Query v5 for mutable server state consumed by Client Components.

- PostgreSQL and authenticated server application services remain authoritative. Query cache contents never authorize a request and never become financial storage.
- A Query Client is scoped to the authenticated private application. It survives client-side navigation within that session and is discarded when the private application unmounts or the user signs out.
- Financial query data remains in memory. Finara will not persist transaction, balance, budget, or AI-response caches to `localStorage` or another browser store by default.
- Server Components may prefetch query data and pass dehydrated state to a Hydration Boundary. For mutable financial data, they should act as prefetchers rather than render a second independently revalidated copy of the same value.
- Client query functions will read through authenticated Route Handlers or an equivalent typed RPC boundary. Server Actions will not be used as query functions; they remain an option for mutations.
- Successful mutations update from an authoritative response or invalidate every affected query key. Finara will not optimistically recalculate authoritative balances or budget totals until rollback and reconciliation behavior is explicitly tested.
- Query keys may contain an opaque session scope for client cache isolation, but the server never trusts a client-supplied user identifier for authorization.

The current dummy-data prototype keeps its existing `useMockFinance` consumer interface and stores one atomic, session-scoped finance snapshot in the Query Client. This is a migration adapter, not the final API shape. Resource-specific queries and filters will be introduced with the first persisted backend slice.

## Consequences

- Changes made on one Finara route are immediately available to other routes without a full page reload.
- Loading, error, mutation, retry, and later optimistic UI behavior have one established client-state mechanism.
- Private cache data cannot survive logout or be recovered from browser storage.
- The backend migration can replace the mock query source without rewriting every page component at once.
- Cross-tab and cross-device changes are not pushed automatically. They require focus refetching, polling, or a later realtime transport.
- If a future screen renders the same mutable value in both a Server Component and a query-owned Client Component, its revalidation strategy must update both or be redesigned around one owner.

## Alternatives considered

### Next.js revalidation only

`refresh`, `revalidatePath`, and cache tags can update Server Component data without a full browser reload. This remains useful for server-owned UI, but it does not provide the same client mutation cache and cross-component query coordination required by Finara's interactive transaction flow.

### React Context with component state

This is the current prototype implementation. It is small, but it has no query lifecycle, invalidation semantics, or direct migration path to API-backed server state.

### Persisted browser cache

Rejected by default because financial records are sensitive and persistence adds stale-data, logout-cleanup, and shared-device exposure risks that the MVP does not need.

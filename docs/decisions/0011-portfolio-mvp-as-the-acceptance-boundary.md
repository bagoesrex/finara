# ADR 0011: Portfolio MVP as the Acceptance Boundary

**Status:** Accepted
**Date:** 2026-09-02
**Decision owner:** Product owner

## Context

Finara is a portfolio project that demonstrates product thinking, UI/UX,
frontend, backend, database, and AI integration. It is not being prepared as a
public financial-data service. ADR 0010 incorrectly made production operations
and vendor approvals blockers for finishing the project.

## Decision

- The project is complete when the PRD's MVP behavior is implemented, the demo
  is understandable, and repository quality gates are repeatable.
- Deterministic tests are the required AI evidence. Live NVIDIA commands remain
  optional demonstrations that use a local ignored credential.
- Hosting regions, provider SLAs or approvals, legal policies, production
  backups, telemetry vendors, analytics targets, and public rollout planning are
  outside the portfolio scope and are not completion blockers.
- Security boundaries that make the implementation technically credible remain
  in scope: server-side authorization, user scoping, validation, exact money,
  secret isolation, AI data minimization, confirmation, and safe failures.
- If Finara later becomes a public product, production readiness receives a new
  specification based on the actual host, users, policies, and providers.

## Consequences

- All thirteen specifications can be evaluated against repository and demo
  evidence without pretending a production organization exists.
- Deferred product features stay explicit, but production operations do not
  lengthen the portfolio checklist.
- ADR 0010 and its production-launch framing are superseded.

## Alternatives considered

### Keep production launch gates as portfolio requirements

Rejected because they do not demonstrate the core Finara problem more clearly
and depend on organizational context that this project intentionally lacks.

# ADR 0010: MVP Scope Closure and Production Launch Gates

**Status:** Superseded by [ADR 0011](./0011-portfolio-mvp-as-the-acceptance-boundary.md)
**Date:** 2026-09-02
**Decision owner:** Product owner

## Context

Finara's thirteen derived specifications retained open questions after the
implemented MVP flows were complete. Leaving those questions unclassified made
working behavior appear unfinished, while answering production, legal, or
business questions from repository code would create unsupported commitments.

The PRD requires a narrow personal-finance MVP and explicitly defers export,
natural-language transaction search, recurring transactions, goals, PWA, and
notifications. It also says custom categories can be added later and forbids
expanding the product merely to make its scope look larger.

## Decision

### Accepted repository MVP

- The repository MVP UI is Indonesian, money is whole IDR, and calendar behavior uses
  `Asia/Jakarta`. English and additional currency/timezone support are later
  product increments.
- The committed system font stack, light palette, and semantic tokens are the
  MVP design system. Dark mode is deferred. The supported responsive baseline
  starts at 320 CSS pixels and preserves a centered shell no wider than 480
  pixels at larger widths.
- Home aggregates every usable account, shows the four newest transactions,
  keeps the composer inline, and displays current-month expense and income.
- Authentication is email/password with database sessions. Password recovery,
  social login, email verification, and MFA require separately accepted flows.
- Account management supports persisted rename. Default user-owned categories
  are view-only. Custom categories, opening-balance edits, account/category
  archive or delete, and related reconciliation are deferred.
- Transaction restore UI, separate merchant/note/provenance fields, transfers,
  and permanent-deletion behavior are not part of the repository MVP.
- Category-month Budgets support create and amount update. Delete/archive,
  independent total-only planning, rollover, and non-Jakarta calendars are
  deferred.
- Profile identity is view-only. Currency, language, and appearance describe
  the fixed MVP context; AI preferences are not exposed. Export stays Phase 2.
- AI supports confirmed transaction previews and the accepted current-month
  financial questions. It does not store conversations, perform
  natural-language transaction search, or answer broader advisory requests.
- The application deliberately mixes Server Components/application-service
  reads, authenticated Route Handlers for mutable browser resources, and a
  Server Action for onboarding. This is the accepted API boundary.
- Stable Microsoft Edge is the repeatable browser baseline. The exact responsive
  acceptance widths are 320, 480, 768, and 1024 CSS pixels, with 1440 pixels as
  an additional large-screen boundary.

### Production launch gates

Repository completion does not authorize a public production launch. Launch
remains blocked until externally owned decisions and environment evidence cover:

1. hosting, managed PostgreSQL, deployment regions, DNS/TLS, secrets, and
   production environment ownership;
2. backups and restore testing, encryption responsibilities, retention,
   deletion, privacy notice, and applicable data-processing policy;
3. NVIDIA production terms, processing region, quota, cost ceiling,
   availability target, and live accuracy/latency evidence;
4. a telemetry vendor and redaction policy, request correlation, RED metrics,
   provider/database tracing, actionable alerts, and runbooks verified in
   staging;
5. consent-aware product analytics, exact week-one cohort/event definitions,
   a target, and a broader parsing-quality target;
6. staging deployment, protected required CI checks, production migration and
   rollback rehearsal, cross-browser/network/accessibility checks, and measured
   production performance;
7. compatible remediation or explicit risk acceptance for any high-severity
   build-tooling advisory that remains outside the production runtime graph.

These gates were later removed from the active portfolio checklist by
[ADR 0011](./0011-portfolio-mvp-as-the-acceptance-boundary.md).

## Consequences

- Every specification can be accepted for the implemented MVP without implying
  that deferred controls or production operations exist.
- UI does not expose placeholders for recovery, deletion, export, custom
  category lifecycle, dark mode, or other unimplemented behavior.
- External launch gates remain visible and testable instead of being buried as
  generic open questions.
- Any future work that changes money, timezone, lifecycle, privacy, or
  deployment semantics needs its own accepted decision before implementation.

## Alternatives considered

### Implement every open question before closing the MVP

Rejected because it would add Phase 2 features and force irreversible legal or
operational behavior without an owner or approved policy.

### Mark the application production-ready because local checks pass

Rejected because local deterministic evidence cannot verify a production
region, provider agreement, backup restoration, observability pipeline, legal
policy, or real-user success target.

### Leave all specifications in Draft

Rejected because the accepted behavior is already implemented and verified.
The distinction between repository completion and launch readiness expresses
the remaining risk more accurately.

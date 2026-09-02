# Production Launch Readiness

**Status:** Blocked pending external decisions and environment evidence

**Last reviewed:** 2026-09-02

The repository MVP is complete within ADR 0010. No production deployment was
performed by this audit. The following gates require owners, accounts, policies,
or production-like infrastructure that are not available from source code.

## Blocking gates

| Gate | Required owner/input | Exit evidence |
| --- | --- | --- |
| Platform and region | Product/operations selects hosting, managed PostgreSQL, regions, DNS/TLS, and secret ownership. | Staging and production environment inventory; HTTPS application smoke check; documented environment variables; least-privilege database access; region/data-flow diagram. |
| Data governance | Product/legal approves privacy notice, processor terms, retention, deletion, export timing, and user-request handling. | Published policy; accepted retention schedule; tested deletion workflow matching the policy; named request owner and response procedure. |
| Database resilience | Operations selects backup frequency, retention, encryption ownership, and recovery targets. | Automated backups enabled; restore rehearsal on non-production data; recorded RPO/RTO; migration and rollback procedure. |
| NVIDIA production use | Product/legal/operations approves provider terms, processing region, data handling, model/version, quota, cost ceiling, timeout, and availability target. | Provider review; production credential in a secret store; hosted dataset pass; representative p50/p95/p99 latency and failure-rate results; manual fallback verified in staging. |
| Observability and incident response | Operations selects telemetry/error-reporting vendors, redaction, sampling, retention, alert channel, and on-call ownership. | Correlated structured events, RED metrics, provider/database traces, symptom alerts, and linked runbooks verified with an induced staging failure. |
| Product analytics | Product defines consent, event names, cohort window, meaningful transaction, week-one target, and broader parsing target. | Approved measurement spec; privacy review; staging events with no raw descriptions/prompts/amounts unless explicitly justified; dashboards validated against fixtures. |
| Release qualification | Engineering/product names supported browsers/networks and deployment approval rules. | Required CI check enforced on the protected branch; staging smoke; Edge plus agreed browser/network matrix; keyboard/screen-reader/contrast review; production-like Core Web Vitals; runtime audit clear. |
| Build-toolchain advisory | Engineering tracks the high-severity `deepmerge-ts` advisory currently reached through Prisma CLI configuration. The checked production runtime graph has zero findings; npm's automatic proposal is an incompatible Prisma downgrade. | Upgrade to a compatible fixed Prisma/tooling chain, or document an explicit time-bounded risk acceptance proving the advisory remains outside runtime and processes only repository-controlled configuration. |

## Observability contract to implement after vendor selection

The first on-call questions are:

1. Which route or dependency is failing, and what safe error class occurred?
2. Is latency in the browser handoff, application, PostgreSQL, or NVIDIA call?
3. Did a transaction or Budget mutation remain idempotent and consistent?
4. Are authentication or AI quotas rejecting abnormal traffic?

Signals must answer those questions without copying sensitive finance data:

- generate or accept a trusted request identifier at the application boundary,
  return it in `X-Request-Id`, and propagate it to safe structured events and
  outbound provider calls;
- collect request rate, error class, and duration histograms using bounded
  labels such as route template, method, status class, and dependency;
- trace PostgreSQL and NVIDIA spans with sampling and no raw prompt, model
  response, transaction description, email, token, credential, or full body;
- alert on sustained user-visible error rate and p95/p99 latency, not raw CPU;
  each alert needs an owner, threshold, duration, and tested runbook.

Instrumentation is not considered complete until an induced staging failure can
be found by request ID and every alert has been test-fired. Choosing a vendor or
retention policy silently in application code is prohibited.

## Release and rollback outline

1. Deploy the exact CI-verified revision to staging and apply the same additive
   migrations intended for production.
2. Run registration/onboarding, manual and AI-confirmed transaction,
   edit/delete, search/detail, Budget, account rename, privacy, and sign-out
   smoke flows against staging services.
3. Verify health, error rate, p95/p99 latency, logs, traces, backup status, and
   the AI manual fallback before enabling public traffic.
4. Start with an internal or small canary cohort if the hosting platform
   supports it. Advance only with stable data integrity, errors, and latency.
5. Roll back application code to the last known-good immutable deployment on
   data-integrity, security, new client-error, greater-than-2x error-rate, or
   greater-than-50% p95-latency regression. Prefer forward-fixing additive
   migrations; rehearse any database rollback before launch.

After deployment, re-run the critical flow, verify telemetry is flowing, and
keep a named operator on the release for the first hour. None of these steps can
be checked off until the real environment and owners exist.

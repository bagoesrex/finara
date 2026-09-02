# Portfolio MVP Specification Audit

**Audit date:** 2026-09-02

**Result:** Complete for the portfolio MVP boundary

This audit maps every specification to implementation evidence and keeps later
product ideas explicit. Public-production operations are outside this project's
scope under [ADR 0011](./decisions/0011-portfolio-mvp-as-the-acceptance-boundary.md).

## Coverage

| Spec | Repository evidence | Deferred beyond portfolio MVP |
| --- | --- | --- |
| [01 Product scope](./specs/01-product-scope.md) | Authenticated Home, transaction, Activity, Budget, and Profile journeys implement `PROD-*`. The final deterministic AI journey records a 480 ms loopback total. | Additional languages and production analytics. |
| [02 Experience](./specs/02-experience-design.md) | Restrained light tokens, system font, safe areas, focus, reduced motion, and the 480 px shell are implemented. Edge covers 320/480/768/1024/1440 px without document overflow. | Dark mode, bundled typography, and a broader browser matrix. |
| [03 Shell and Home](./specs/03-application-shell-home.md) | Home shows aggregate balance, monthly expense/income, inline composer, four recent transactions, and Activity access with authoritative refresh. | Wider dashboards and a separate AI destination. |
| [04 Authentication](./specs/04-authentication-onboarding.md) | Registration, first-account setup, database sessions, generic failures, rate limiting, server protection, and sign-out revocation are tested. | Recovery, social login, verification, MFA, and account deletion. |
| [05 Accounts/categories](./specs/05-accounts-categories.md) | User-owned defaults, opening snapshots, ownership/type validation, and persisted account rename are tested through browser and server boundaries. | Custom categories and account/category lifecycle. |
| [06 Transactions](./specs/06-transactions.md) | Exact IDR, manual and AI-confirmed create, idempotent retry, edit, soft delete, reconciliation, and two-user isolation are covered. | Restore, separate merchant/note/provenance, transfers, and purge policy. |
| [07 Activity](./specs/07-activity-search.md) | Grouping, 20-row cursor pagination, text and exact-IDR search, detail, context retention, and ownership are covered. | Structured filters and natural-language search. |
| [08 Budget](./specs/08-budget.md) | Category-month create/update, derived totals, progress states, idempotent retry, reload persistence, and cross-user denial are covered. | Delete/archive, total-only planning, rollover, and other timezones. |
| [09 AI assistant](./specs/09-ai-assistant.md) | Strict schemas, dataset `1.0.0`, authorized server tools, rate limits, confirmation, provider failures, and deterministic browser rendering are covered. | Conversation history, wider date language, natural-language search, and broader model evaluation. |
| [10 Profile/settings](./specs/10-profile-settings.md) | Protected identity, finance settings, fixed locale/currency/appearance, truthful AI privacy copy, rename, and sign-out are implemented. | Editable identity/preferences, dark mode, export, and account deletion. |
| [11 Data model](./specs/11-data-model.md) | Prisma migrations enforce exact `BIGINT` IDR, Jakarta dates, ownership, idempotency, soft deletion, and Budget relations. | Richer transaction fields and additional lifecycle/timezone semantics. |
| [12 Architecture/security](./specs/12-architecture-security.md) | Server-only data/provider modules, strict validation, user-scoped services, shared calculations, secret isolation, minimized prompts, and safe errors are covered. | Production hosting, operations, and telemetry. |
| [13 Quality/success](./specs/13-quality-success.md) | 161 tests, PostgreSQL integration, eight Edge journeys, lint, typecheck, runtime audit, build, and GitHub Actions are repeatable. | Production analytics, monitoring, and rollout measurement. |

## Repeatable quality gates

```bash
npm test
npm run test:integration
npm run lint
npm run typecheck
npm audit --omit=dev --omit=optional --omit=peer --audit-level=high
npm run build
npm run e2e
```

Live NVIDIA checks are optional portfolio demonstrations and require an ignored
local credential:

```bash
npm run ai:check:nvidia
npm run ai:eval:transactions
```

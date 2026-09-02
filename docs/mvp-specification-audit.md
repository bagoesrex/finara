# MVP Specification Audit

**Audit date:** 2026-09-02

**Repository result:** Complete for the accepted MVP boundary

**Production launch result:** Blocked by the external gates in
[`launch-readiness.md`](./launch-readiness.md)

This audit reconciles every specification with implementation evidence, an
explicit PRD-grounded exclusion, or a named launch gate. `Accepted for MVP`
means the repository behavior is complete; it does not mean the service has
been deployed or approved for public production data.

## Coverage

| Spec | Accepted repository boundary and repeatable evidence | Deferred or external |
| --- | --- | --- |
| [01 Product scope](./specs/01-product-scope.md) | The authenticated Home, manual/AI transaction, Activity, Budget, and Profile journeys implement `PROD-*`. The final deterministic AI journey records 106 ms parse handoff plus 374 ms persistence (480 ms total) on the accepted loopback profile. | Indonesian-only is accepted for MVP. Week-one measurement needs an analytics definition, target, consent, and provider before launch. |
| [02 Experience](./specs/02-experience-design.md) | [`globals.css`](../src/app/globals.css) contains the restrained light tokens, system font, safe-area shell, focus, reduced-motion, and 480 px cap. Edge exercises Home, Activity, Budget, and Profile at 320/480/768/1024/1440 px with no document overflow and one four-item navigation. | Dark mode and bundled typography are later product decisions. Browser engines beyond Edge remain a pre-launch compatibility gate. |
| [03 Shell and Home](./specs/03-application-shell-home.md) | [`home-dashboard.tsx`](../src/components/home-dashboard.tsx) shows aggregate available balance, current-month expense/income, inline composer, four recent transactions, and Activity access. Confirmed creates invalidate authoritative queries; browser tests cover preview, persistence, and refresh-free reconciliation. | Wider dashboards and a separate AI destination are excluded by the PRD. |
| [04 Authentication](./specs/04-authentication-onboarding.md) | ADR 0004, database integration checks, production HTTP checks, and Edge cover registration, first-account setup, returning access, generic failure, rate limiting, sign-out, and server-session revocation. | Recovery, social identity, verification, and MFA are later flows. Account/data deletion needs the legal and operations gate. |
| [05 Accounts/categories](./specs/05-accounts-categories.md) | User-owned defaults, account/category ownership and type checks, opening snapshots, and persisted account rename have unit, PostgreSQL, HTTP, and browser evidence. | Default categories remain view-only. Custom category and account/category lifecycle are deferred. |
| [06 Transactions](./specs/06-transactions.md) | ADR 0005 and the schema/service/API/browser suites cover exact IDR, manual and AI-confirmed create, idempotent retry, edit, confirmed soft delete, and summary/Budget reconciliation with two-user isolation. | Restore, permanent retention/deletion, separate merchant/note/provenance, and transfers are outside MVP; retention/deletion is a launch gate. |
| [07 Activity](./specs/07-activity-search.md) | All-history grouping, stable 20-row cursor pagination, case-insensitive text search, exact normalized IDR search, clear/no-result states, detail, scroll/context retention, and ownership are covered across contracts, PostgreSQL, HTTP, and Edge. | Additional structured filters and natural-language search are later work. |
| [08 Budget](./specs/08-budget.md) | ADR 0006 and the Budget checks cover category-month create/update, exact derived totals, near-limit/overspent states, transaction reconciliation, idempotent retry, reload persistence, and cross-user denial. | Delete/archive, total-only planning, rollover, and multi-timezone behavior are deferred. |
| [09 AI assistant](./specs/09-ai-assistant.md) | ADRs 0007-0008, strict schemas, dataset `1.0.0`, provider-envelope tests, authorized tools, rate limits, deterministic browser interception, and the explicit credentialed NVIDIA commands cover the accepted intents. | Production provider review, SLO/quota/cost, live latency, broader accuracy, more date language, and conversation persistence remain launch or later-product gates. |
| [10 Profile/settings](./specs/10-profile-settings.md) | Protected Profile exposes authenticated identity, persisted account/category context, fixed locale/currency/appearance, truthful AI privacy disclosure, and sign-out. Account rename and session revocation run in Edge. | Identity editing, preference changes, AI preferences, and dark mode are deferred. Export is Phase 2; account/data deletion is a launch gate. |
| [11 Data model](./specs/11-data-model.md) | Reviewed migrations and Prisma constraints represent User, Account, Category, Transaction, and Budget with exact `BIGINT` IDR, Jakarta dates, idempotency, soft deletion, ownership, and deliberate query indexes. Integration checks exercise precision and relational abuse cases. | Lifecycle/retention, optional richer transaction fields, and non-Jakarta calendars are deferred or launch-gated. |
| [12 Architecture/security](./specs/12-architecture-security.md) | Server-only Prisma/auth/provider modules, strict DTO validation, origin/body controls, user-scoped services, shared calculations, provider timeout, minimized prompts, safe errors, and runtime-only dependency audit cover the repository boundary. | Hosting, regions, encryption responsibilities, backups, retention/deletion, and deployable observability are production gates. |
| [13 Quality/success](./specs/13-quality-success.md) | 161 deterministic tests, the PostgreSQL/service integration command, eight Edge journeys, lint, route-aware typecheck, runtime audit with zero findings, production build, and GitHub Actions form repeatable gates. The local timing artifact separates parsing UI handoff and persistence. | Cross-browser/network/staging evidence, real NVIDIA latency, production Core Web Vitals, analytics, week-one target, broader parsing target, and compatible remediation or risk acceptance for the Prisma CLI advisory remain launch gates. |

## Repeatable repository gates

```bash
npm test
npm run test:integration
npm run lint
npm run typecheck
npm audit --omit=dev --omit=optional --omit=peer --audit-level=high
npm run build
npm run e2e
```

Live NVIDIA checks require an ignored local credential and intentionally remain
outside deterministic pull-request CI:

```bash
npm run ai:check:nvidia
npm run ai:eval:transactions
```

The committed CI workflow repeats deterministic gates against an ephemeral
PostgreSQL service. A production launch additionally requires the external
evidence below; local success must not be presented as that evidence.

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
- Keep `POST /api/ai/transaction-previews` stable and add an additive composer
  response resource for transaction previews and current-month read-only
  financial questions.
- Use one strict NVIDIA JSON response to select an allowlisted intent. Server
  services execute every read tool and format all financial values; no account,
  transaction, balance, or budget values are returned to the model.
- Reuse the persisted per-user AI preview quota for composer requests so a
  single user cannot bypass provider limits by switching endpoints.

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

- [x] Task 13: Record category-only monthly Budget semantics and add the constrained Prisma model.
- [x] Task 14: Add precise Budget contracts and a server-side monthly calculation service.
- [x] Task 15: Expose authenticated Budget list/create/update Route Handlers with abuse-case checks.
- [x] Task 16: Hydrate the Budget route and replace session-only allocation state with TanStack Query mutations.

### Checkpoint: Persisted Budget

- [x] Budget allocation and derived spending survive reloads and remain user-scoped.
- [x] Transaction changes invalidate Budget calculations without client-side financial reconciliation.
- [x] Focused tests, runtime flows, lint, type checking, and production build pass.

### Phase 6: NVIDIA-assisted transaction preview

- [x] Task 17: Record the NVIDIA Build provider boundary and strict parsing contracts.
- [x] Task 18: Add the authenticated NVIDIA transaction-preview service and Route Handler.
- [x] Task 19: Replace Home's primary local parser with async AI parsing and an explicit manual fallback.

### Checkpoint: AI Transaction Preview

- [x] Model output cannot persist a transaction or introduce account/category IDs.
- [x] Provider failure preserves input and exposes retry/manual paths.
- [x] Unit tests, lint, type checking, production build, and unauthenticated HTTP smoke pass.
- [x] Hosted inference smoke passes with the locally configured credential.

### Phase 7: Read-only financial questions

- [x] Task 20: Define the additive composer request/response and strict NVIDIA
  intent-routing contracts.
- [x] Task 21: Add user-scoped read tools and deterministic current-month
  financial answers.
- [x] Task 22: Expose the authenticated, rate-limited composer Route Handler and
  client request boundary.
- [x] Task 23: Let Home render either a transaction preview or a concise
  financial answer from the same composer.

### Checkpoint: Read-only Financial Questions

- [x] Saldo, current-month income/expense, top/category spending, and budget
  remaining answers come only from authorized PostgreSQL data.
- [x] Model output can select only an allowlisted read intent and cannot provide
  SQL, user IDs, record IDs, calculated totals, or persistence instructions.
- [x] Transaction entry remains a one-model-call preview flow with explicit
  confirmation before save.
- [x] Unit, database, production HTTP, live provider, lint, typecheck, and
  production-build verification pass. Chrome DevTools MCP was unavailable, so
  authenticated SSR and source-level accessibility checks cover the UI here.

### Phase 8: First-class manual transaction entry

- [x] Task 24: Extract deterministic manual-draft construction with focused
  regression tests.
- [x] Task 25: Keep manual entry available as a secondary Home action while
  preserving typed-text recovery after an AI parsing failure.

### Checkpoint: Manual Transaction Entry

- [x] A user can open an empty expense draft without calling NVIDIA or first
  entering natural-language text.
- [x] A recoverable AI failure can carry the current text into the same editable
  confirmation sheet.
- [x] Confirmed manual transactions use the existing idempotent transaction API
  and authoritative query invalidation path.
- [x] Focused tests, lint, type checking, and production build pass.

### Phase 9: Persisted account rename

- [x] Task 26: Define the strict account rename request/response contract.
- [x] Task 27: Add the user-scoped serializable rename service and database
  integration checks.
- [x] Task 28: Expose the authenticated Account PATCH Route Handler with abuse
  case and production HTTP coverage.
- [x] Task 29: Add the browser request boundary and targeted authoritative query
  invalidation.
- [x] Task 30: Replace session-only account overrides with the persisted mutation
  and complete saving, success, and failure UI states.

### Checkpoint: Persisted Account Rename

- [x] Rename survives reload and updates account and transaction projections.
- [x] Invalid, duplicate, missing, and cross-user mutations cannot alter data.
- [x] Failed saves preserve the current input and allow retry.
- [x] Unit, database, production HTTP, lint, typecheck, and production-build
  verification pass.

### Phase 10: Truthful profile privacy

- [x] Task 31: Replace obsolete prototype status with a protected Data & Privacy
  surface that describes current storage, AI processing, and user controls.

### Checkpoint: Profile Privacy

- [x] Profile links to Data & Privacy and no longer claims persisted
  transactions are browser-session-only.
- [x] The disclosure matches the implemented AI prompt boundary without
  promising unresolved export, retention, or deletion behavior.
- [x] Signed-out protection and authenticated SSR are covered by the production
  Profile runtime flow.

### Phase 11: Versioned AI parsing evaluation

- [x] Task 32: Define the versioned PRD transaction dataset and deterministic
  field-level evaluator through a failing-first unit-test cycle.
- [x] Task 33: Add the explicit NVIDIA evaluation command and correct the prompt
  regressions exposed by its first baseline.

### Checkpoint: AI Parsing Evaluation

- [x] Dataset `1.0.0` covers every PRD transaction phrase with stable Jakarta
  date context and field-specific expectations.
- [x] The first hosted-model baseline exposed amount, category, and time errors;
  the unchanged dataset passes 5/5 after shared prompt corrections.
- [x] Live evaluation is credentialed and explicit rather than making the
  deterministic unit suite depend on NVIDIA availability.

### Phase 12: Real-browser transaction baseline

- [x] Task 34: Select and configure the first repeatable browser automation
  environment with a production server and local-database safety boundary.
- [x] Task 35: Cover registration through persisted manual transaction Activity
  visibility in one isolated mobile Edge journey.

### Checkpoint: Browser Transaction Baseline

- [x] `npm run e2e` returns a normal pass/fail exit code and does not leave the
  application server or generated E2E user running.
- [x] The critical journey passes at the Pixel 7 viewport with Indonesian locale
  and Jakarta timezone, with no captured console warning or error.
- [x] The rendered Activity artifact shows the saved `Rp25.000` expense without
  clipping or desktop-only navigation.

### Phase 13: Recoverable transaction-save failure

- [x] Task 36: Simulate an ambiguous save where PostgreSQL commits successfully
  but the browser receives a transient failure response.
- [x] Task 37: Preserve the draft, announce the failure, expose an explicit retry,
  and prove the retry remains idempotent in mobile Edge.

### Checkpoint: Recoverable Transaction Save

- [x] Every entered field remains visible and editable after the failed response.
- [x] Retry uses the original `clientRequestId` and Home renders one transaction.
- [x] The expected simulated `503` is the only browser-console error; no uncaught
  page error or unrelated warning is accepted.

### Phase 14: Real-browser Budget baseline

- [x] Task 38: Share guarded E2E user lifecycle helpers across the transaction
  and Budget journeys.
- [x] Task 39: Cover category allocation and reload persistence in mobile Edge.
- [x] Task 40: Simulate an ambiguous Budget save, preserve the draft, expose an
  explicit retry, and prove natural-key idempotency in the rendered application.

### Checkpoint: Browser Budget Baseline

- [x] The empty Budget state can create one category allocation whose amount and
  accessible progress survive a browser reload.
- [x] A committed response rewritten as `503` leaves category and amount intact;
  retry sends the same payload and renders one category/month allocation.
- [x] All four feature journeys pass sequentially without sharing users or
  loopback authentication rate-limit state.

### Phase 15: Activity contract closure

- [x] Task 41: Define exact-IDR search normalization with focused contract
  tests for plain digits, Indonesian separators, and `rb` shorthand.
- [x] Task 42: Match normalized amounts in the authorized transaction query and
  verify amount search through the production HTTP boundary.
- [x] Task 43: Make the Activity range label truthful for its all-history query
  and cover search, clear, pagination, and detail navigation in mobile Edge.

### Checkpoint: Activity Search

- [x] Description, account, category, and normalized amount searches remain
  case-insensitive, user-scoped, and bounded by cursor pagination.
- [x] Activity never presents a current-month label over an all-history query.
- [x] Search, no-results, clear, and transaction-detail navigation are verified
  in the rendered application.

### Phase 16: Remaining critical browser flows

- [x] Task 44: Cover transaction edit and confirmed delete with authoritative
  Home/Activity reconciliation.
- [x] Task 45: Cover persisted account rename and sign-out/session revocation.
- [x] Task 46: Cover AI transaction preview and current-month answer UI with a
  deterministic authenticated provider boundary.
- [x] Task 47: Add narrow-mobile and large-viewport smoke checks without
  changing Finara's mobile information architecture.

### Checkpoint: MVP Browser Matrix

- [x] Every destructive or persisted MVP workflow has at least one real-browser
  happy path and the highest-risk recovery path.
- [x] Supported viewport checks show no horizontal clipping, duplicate desktop
  navigation, or inaccessible primary action.

### Phase 17: Continuous quality gates

- [x] Task 48: Add a GitHub Actions workflow with frozen npm installation,
  PostgreSQL migrations, deterministic tests, lint, type checking, build, and
  mobile Edge browser automation.
- [x] Task 49: Document local/CI commands and keep credentialed NVIDIA checks
  explicitly separate from deterministic pull-request gates.

### Checkpoint: CI

- [x] The workflow uses placeholders only, scopes permissions minimally, and
  fails closed when any deterministic quality gate fails.
- [x] CI and local commands execute the same checked-in scripts.

### Phase 18: MVP specification closure

- [ ] Task 50: Reconcile every Draft requirement with implementation evidence,
  an explicit MVP exclusion grounded in the PRD, or a named external launch
  blocker.
- [ ] Task 51: Add measured browser timing evidence for the accepted transaction
  baseline without introducing an analytics provider prematurely.
- [ ] Task 52: Record the production-only decisions that require deployment,
  legal/privacy, or business input and cannot be inferred from repository code.

### Checkpoint: Specification Closure

- [ ] Every in-repository MVP acceptance criterion is implemented and mapped to
  a repeatable check.
- [ ] Deferred behavior is explicit and does not masquerade as implemented UI.
- [ ] Remaining blockers require external authority rather than more local code.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Local database password enters Git history | High | Store it only in ignored `.env`; commit a placeholder example and run secret-diff checks. |
| Schema encodes unresolved product behavior | High | Require an accepted domain decision checkpoint before each migration. |
| Database code leaks into Client Components | High | Mark the client factory `server-only` and expose narrow DTOs through a later DAL. |
| Prisma client connections multiply during hot reload | Medium | Cache one development client instance on `globalThis`. |
| Prototype UI is partially backed by real data | Medium | Migrate one complete authenticated vertical slice at a time. |
| Hosted NVIDIA tool-calling configuration differs from self-hosted NIM | Medium | Use the already verified JSON response mode to select one allowlisted server tool in a single bounded call. |
| A model-selected read leaks another user's finance data | High | Derive identity from the server session and inject it into every tool; never accept `userId` or database IDs from model output. |

## Open questions

- Restore and permanent-retention behavior for soft-deleted transactions; neither is required by the current MVP.
- Delete/archive behavior for Budget allocations; create and amount update are the accepted MVP operations.
- Date ranges beyond the current Jakarta month and natural-language merchant
  search remain later financial-question slices.

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
- Mock finance fixtures and their migration adapter were removed. Home, Activity, transaction detail, Profile account counts, finance settings, and Budget now read persisted projections. Account rename now persists through its user-scoped API and invalidates account-bearing projections.
- Migration `20260829021840_add_budgets` adds positive exact-IDR category allocations, database-enforced same-user expense-category references, first-of-month periods, and per-user/category/month uniqueness. Schema and service checks cover precision, every constraint, idempotent create/conflict, cross-user denial, deleted and out-of-period transaction exclusion, derived totals, and each progress-status boundary.
- Authenticated Budget Route Handlers expose monthly overview, create, and amount update contracts with precise string-money DTOs. The Budget Server Component preloads the viewer/month query, while successful Budget mutations and transaction changes await targeted TanStack Query invalidation before reporting success.
- `npm test` passes 91 tests; lint, type checking, and the Next.js production build pass. PostgreSQL schema/service checks and the production HTTP smoke flows pass, including authenticated SSR hydration on Home, Activity, and Budget; cross-user denial; sequential and concurrent idempotent create; transaction edit/soft delete; summary reconciliation; persisted Budget create/update calculations; duplicate-query rejection; and exact BIGINT rendering beyond JavaScript's safe-integer range.
- Chrome DevTools MCP was not available in this environment, so the no-reload behavior is covered by focused query invalidation tests and the production HTTP hydration smoke rather than an automated real-browser interaction.
- ADR 0007 selects NVIDIA Build's OpenAI-compatible hosted endpoint with `nvidia/nemotron-3.5-lightning-30b-a3b` as the configurable default. The parser uses one non-streaming, non-retried, eight-second request with reasoning disabled and a 256-token output cap.
- AI parsing is exposed only as authenticated `POST /api/ai/transaction-previews`. Strict schemas reject malformed provider output; server code maps hints to viewer-owned account/category records; the existing confirmation sheet and transaction API remain the only persistence path.
- `npm test` passes 107 tests after the AI slice. Lint, type checking, the Next.js production build, unauthenticated POST `401`, unsupported GET `405`, and npm registry signatures pass. Live NVIDIA inference remains pending because no `NVIDIA_API_KEY` is present in the local environment; run `npm run ai:check:nvidia` after configuring it.
- ADR 0008 keeps NVIDIA at the intent-routing boundary for current-month
  questions. Financial answers are calculated once by viewer-scoped server
  tools and are never returned to the model for rephrasing.
- The AI finance tool integration check covers cross-user isolation, deleted
  and prior-month exclusion, empty budgets, category matching, and exact IDR
  above JavaScript's safe-integer range.
- The production composer HTTP flow verifies authenticated Home SSR, `401`,
  cross-origin `403`, forged-identity `422`, deterministic balance success with
  no transaction mutation, and shared-quota `429` with `Retry-After`.
- Live NVIDIA smoke verifies both `GET_BALANCE` and `CREATE_TRANSACTION` against
  the configured hosted model. A regression test prevents the model from
  returning an embedded `oneOf` schema instead of an intent instance.
- Final Phase 7 gates pass: ESLint is clean, all 126 tests across 18 files pass,
  strict type checking passes, and the Next.js 16.3.2 production build includes
  the dynamic composer Route Handler.
- Phase 8 extracts deterministic manual-draft defaults from Home and exposes a
  permanent secondary action. Normal use opens a blank expense draft without an
  AI request; recoverable AI errors pass the current text through the local
  parser into the same confirmation sheet. The existing transaction mutation
  remains the only save path.
- Final Phase 8 gates pass: ESLint is clean, all 131 tests across 19 files pass,
  strict type checking and the Next.js 16.3.2 production build pass, and the
  authenticated production Home smoke verifies the manual action's accessible
  label. Chrome DevTools MCP remains unavailable for an automated interactive
  browser run.
- Phase 9 account rename gates pass: all 137 tests across 20 files, ESLint,
  type checking, the PostgreSQL service check, production build, and production
  HTTP flow pass. The HTTP flow verifies authentication, origin/media/body
  validation, duplicate and cross-user denial, persistence, transaction
  projection refresh, and authenticated SSR after reload. Chrome DevTools MCP
  remains unavailable, so interactive behavior is covered by focused query
  invalidation tests and source-level accessibility review.
- Phase 10 replaces Profile's obsolete session-only prototype message with a
  protected, server-rendered Data & Privacy route. The disclosure is grounded
  in the current prompt builders: composer text and category names can reach
  NVIDIA, while identity, internal IDs, balances, stored transaction history,
  Budget amounts, and database access remain application-side. Export,
  retention, and deletion controls remain outside this slice because their
  behavior is still unresolved.
- Final Phase 10 gates pass: all 137 tests across 20 files, ESLint, route-aware
  type checking, the Next.js 16.3.2 production build, and the authenticated
  production Profile HTTP flow. The flow covers signed-out redirect protection,
  Profile navigation, removal of stale copy, and the rendered privacy content.
  Chrome DevTools MCP is not configured in this environment, so screenshot,
  console, viewport, and accessibility-tree inspection remain unavailable.
- Phase 11 adds dataset `1.0.0`, a deterministic field-level matcher, and
  `npm run ai:eval:transactions`. The initial live NVIDIA run passed 3/5 and
  identified `350k` normalization, Wi-Fi categorization, and qualitative-time
  gaps. Shared transaction guidance now includes explicit IDR examples,
  semantic default-category mappings, and editable representative time values;
  the unchanged live dataset then passed 5/5.
- Final Phase 11 gates pass: all 142 tests across 21 files, ESLint, route-aware
  type checking, and the Next.js 16.3.2 production build. The credentialed live
  evaluation passes all five dataset `1.0.0` cases against the configured
  NVIDIA model.
- Final Phase 12 gates pass: Playwright 1.62.1 on stable Microsoft Edge completes
  the isolated Pixel 7 journey, all 142 unit tests pass, ESLint and route-aware
  type checking are clean, and the Next.js 16.3.2 production build succeeds.
  The browser gate records a confirmed `Rp25.000` Food & Drink expense, verifies
  Home and Activity with a clean console and inspected mobile artifact, rejects
  non-local database hosts, and leaves no generated E2E user behind.
- Final Phase 13 gates pass: both mobile Edge journeys, all 142 unit tests,
  ESLint, route-aware type checking, and the Next.js 16.3.2 production build are
  clean. The ambiguous-save journey preserves the complete draft, exposes
  `Coba lagi`, reuses its idempotency key, and renders one persisted transaction.
- Final Phase 14 gates pass: all four mobile Edge journeys, all 142 unit tests,
  ESLint, route-aware type checking, and the Next.js 16.3.2 production build are
  clean. Budget creation survives reload; the ambiguous-save journey preserves
  its draft, exposes `Coba lagi`, retries the exact payload, and renders one
  persisted category/month allocation. Guarded local cleanup leaves zero E2E
  users and zero loopback authentication rate-limit rows.
- Final Phase 15 gates pass: exact IDR search accepts plain digits, consistent
  Indonesian/English thousands separators, and `rb`/`ribu`/`k`/`jt`/`juta`
  shorthand without floating-point arithmetic. Authorized database and HTTP
  checks cover matching and non-matching amounts. Mobile Edge verifies the
  truthful all-history label, amount search, no-results/clear, detail navigation,
  and cursor pagination without resetting the Activity scroll container.
- Final Phase 16 gates pass: mobile Edge reconciles transaction edit/delete
  against Home and Activity, persists account rename, revokes the private
  session on sign-out, renders deterministic AI preview/answer states, and
  records separate parsing/persistence timing. Smoke checks at 320x700 and
  1440x900 retain one four-item navigation, a maximum 480px app shell, no
  document overflow, and a reachable manual-entry action. The delete journey
  also caught and removed an unnecessary post-delete detail refetch that logged
  an expected 404 to the browser console.
- Phase 17 defines one fail-fast GitHub Actions job on pull requests and pushes
  to `main`: Node 24 frozen install, PostgreSQL 17 health check and migrations,
  lint, route-aware type checking, 161 unit tests, deterministic integration
  scripts, high-severity production-runtime dependency audit, production build,
  and all eight stable-Edge journeys. The job has read-only repository
  permission, a 20-minute timeout, cancellable superseded runs, ephemeral
  CI-only credentials, and retained Playwright evidence. NVIDIA credentials are
  never required. Prisma's dev-only CLI chain retains an upstream high advisory;
  its suggested automatic fix is a breaking major downgrade and is tracked for
  an upstream-compatible release rather than hidden or force-applied.

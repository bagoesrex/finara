# PostgreSQL Foundation Tasks

- [x] Add Prisma 7.10.0, the PostgreSQL adapter/driver, and safe database scripts.
  - Acceptance: runtime and CLI packages are pinned compatibly; build/typecheck regenerate the client.
  - Verify: inspect the lockfile, run package signatures/audit, and run `npm run db:validate`.
  - Files: `package.json`, `package-lock.json`.

- [x] Configure local and example database environments.
  - Acceptance: the real connection string is ignored; the committed example contains placeholders only.
  - Verify: `git check-ignore` matches the real env file and `git diff` contains no password.
  - Files: `.gitignore`, `.env`, `.env.example`.

- [x] Add the model-free Prisma foundation and server-only client.
  - Acceptance: Prisma targets PostgreSQL, emits the supported generated client, and cannot be imported into client code.
  - Verify: `npm run db:generate`, runtime client connection check, lint, and typecheck.
  - Files: `prisma.config.ts`, `prisma/schema.prisma`, `src/server/db/client.ts`, focused test.

- [x] Verify the real local database connection read-only.
  - Acceptance: the application driver connects to `finara_db` and `SELECT 1` returns successfully without mutating schema or rows.
  - Verify: `npm run db:check`.
  - Files: a narrowly scoped script and `package.json`.

- [x] Complete the domain decision checkpoint before creating tables.
  - Acceptance: money, currency, opening snapshot, timezone, and category ownership decisions are accepted and documented.
  - Verify: accepted ADR/spec updates have no unresolved contradiction.

- [x] Create and apply the first onboarding schema migration.
  - Acceptance: only `User`, `Account`, and `Category` are persisted, with user ownership and the accepted IDR opening-snapshot invariants.
  - Verify: migration status is current and `npm run db:test:onboarding` passes without leaving temporary rows.

- [x] Select authentication before implementing persisted onboarding.
  - Acceptance: session identity is server-resolved and credential endpoints have an approved security design.
  - Verify: authentication ADR and abuse-case tests exist before financial endpoints.

- [x] Implement and verify the Better Auth foundation.
  - Acceptance: credential, session, verification, and rate-limit models cannot collide with financial accounts; public auth endpoints use server-only configuration.
  - Verify: schema migration, registration/session/sign-out integration checks, rate-limit abuse test, lint, typecheck, and build pass.

- [x] Persist onboarding atomically and read the authoritative Home account snapshot.
  - Acceptance: authenticated setup creates the first account and default categories exactly once; returning users skip onboarding; opening balance creates no transaction.
  - Verify: application-service tests, unauthorized action checks, and the complete HTTP auth/onboarding smoke flow.

- [x] Add the accepted transaction database model and migration.
  - Acceptance: positive exact IDR, per-user idempotency, same-user account/category ownership, category/type compatibility, optional Jakarta local time, and soft delete are enforced.
  - Verify: migration status and a database integration check covering precision, invalid references, duplicate retries, summaries, and deleted-row exclusion.

- [x] Add authenticated transaction resource contracts and services.
  - Acceptance: paginated list, detail, create, edit, and delete use stable DTOs; every operation derives owner identity from the server session.
  - Verify: contract/service tests cover invalid input, unauthenticated access, cross-user access, incompatible category types, and generic errors.

- [x] Hydrate TanStack Query and persist transaction create/list.
  - Acceptance: initial private-app data is server-prefetched; a confirmed transaction is persisted once and appears on Home and Activity without browser reload.
  - Verify: focused query/mutation tests plus runtime create and cross-page navigation smoke.

- [x] Persist transaction edit and soft delete.
  - Acceptance: detail edits and confirmed deletion update lists, balances, summaries, and budget-derived views through targeted invalidation; deleted rows remain excluded from normal reads.
  - Verify: service/API/query tests, runtime edit/delete smoke, lint, typecheck, and production build.

- [x] Persist monthly category Budget schema and calculations.
  - Acceptance: exact positive IDR, expense-category ownership, first-of-month period, and per-user/category/month uniqueness are database enforced; totals and status are derived server-side.
  - Verify: contract tests, migration status, and database/service integration checks.

- [x] Add authenticated Budget API and TanStack Query UI.
  - Acceptance: list/create/update are user-scoped; Budget route is server-prefetched; mutations survive reload and invalidate authoritative Budget data.
  - Verify: abuse-case HTTP flow, query tests, runtime page smoke, lint, typecheck, and production build.

- [x] Define the NVIDIA Build transaction-preview boundary.
  - Acceptance: provider/model configuration, structured extraction, data minimization, timeout, failure, and confirmation rules are recorded and strictly typed.
  - Verify: ADR/spec review plus contract, prompt-injection, provider-envelope, malformed-output, and client-response tests.

- [x] Integrate authenticated NVIDIA parsing into Home.
  - Acceptance: Home requests an authorized preview, prevents duplicate parsing, never auto-saves, preserves input on failure, and offers manual entry.
  - Verify: 107 unit tests, lint, typecheck, production build, and HTTP 401/405 smoke pass.

- [x] Verify hosted NVIDIA inference with a local credential.
  - Acceptance: the documented PRD phrase returns the expected strict extraction from the configured hosted model without exposing the key.
  - Verify: set `NVIDIA_API_KEY` in ignored `.env`, then run `npm run ai:check:nvidia`.

- [x] Define additive composer and NVIDIA intent-routing contracts.
  - Acceptance: one strict discriminated union covers transaction preview,
    balance, monthly summary, budget, and unsupported intents without accepting
    model-provided user or record IDs.
  - Verify: focused contract, prompt-injection, and provider-envelope tests fail
    before implementation and pass afterward.

- [x] Add deterministic current-month finance read tools.
  - Acceptance: saldo, income/expense summary, category spending, and budget
    remaining are derived from viewer-scoped PostgreSQL services and returned as
    concise application-authored text.
  - Verify: database integration checks include cross-user isolation, deleted
    transaction exclusion, exact IDR, empty data, and category matching.

- [x] Add the authenticated composer response API.
  - Acceptance: POST validates input, session, origin, provider output, and the
    shared persisted AI quota; the existing transaction-preview endpoint remains
    unchanged.
  - Verify: client contract tests plus HTTP 401, 403, 422, 429, and success flows.

- [x] Connect Home to transaction previews and financial answers.
  - Acceptance: one composer shows a confirmation sheet for transactions, an
    announced concise result for questions, and safe retry/manual states without
    adding chat history.
  - Verify: authenticated production SSR, source-level keyboard/accessibility
    review, unit tests, lint, typecheck, and production build. Chrome DevTools
    MCP was unavailable for an automated interactive browser run.

- [x] Make manual transaction entry a permanent Home action.
  - Acceptance: the secondary action opens an empty expense draft with today's
    Jakarta date, the first account, and a compatible category without an AI
    request; AI recovery may prefill the current text; saving still requires the
    existing confirmation sheet.
  - Verify: deterministic draft tests, authenticated Home runtime smoke, query
    invalidation regression coverage, lint, typecheck, and production build.

- [x] Define the persisted account rename contract.
  - Acceptance: PATCH accepts only a trimmed 1-40 character name and returns a
    narrow renamed-account DTO; malformed IDs and extra fields are rejected.
  - Verify: focused contract tests fail before implementation and pass afterward.

- [x] Persist account rename with server ownership enforcement.
  - Acceptance: rename is scoped to the session user, rejects case-insensitive
    duplicates, permits capitalization changes, and never rewrites transaction
    foreign keys or balances.
  - Verify: database integration checks cover two users, duplicate names,
    concurrent attempts, persistence, and unchanged financial records.

- [x] Expose the authenticated Account PATCH API.
  - Acceptance: the Route Handler validates origin, media type, size, JSON,
    path ID, and body; inaccessible IDs share a generic 404 response.
  - Verify: production HTTP smoke covers 401, 403, 404, 409, 415, 422, success,
    reload, and cross-user denial.

- [x] Invalidate account-dependent client resources after rename.
  - Acceptance: snapshot, transaction lists, and cached transaction details are
    invalidated and awaited; Budget data is not refetched unnecessarily.
  - Verify: focused TanStack Query tests cover active refetch success/failure.

- [x] Connect Finance Settings to persisted rename.
  - Acceptance: pending controls cannot duplicate submission; success closes the
    sheet and announces persistence; failure preserves input and supports retry.
  - Verify: authenticated runtime flow, source-level accessibility review, unit
    tests, lint, typecheck, and production build.

- [x] Make Profile's Data & Privacy boundary truthful and reachable.
  - Acceptance: Profile no longer describes transactions as session-only; a
    protected, informational page explains persisted data, the narrow composer
    data sent to NVIDIA, and currently supported confirmation/sign-out controls
    without inventing export or deletion behavior.
  - Verify: signed-out redirect and authenticated SSR assertions, source-level
    semantic/accessibility review, lint, typecheck, and production build.

- [x] Add a versioned PRD transaction-parsing evaluation dataset.
  - Acceptance: dataset `1.0.0` includes all five PRD phrases with fixed Jakarta
    context and field-level expectations that tolerate wording without hiding
    persisted-field errors.
  - Verify: failing-first unit tests cover dataset identity, flexible morning
    time, every field mismatch, and incorrect intent routing.

- [x] Add and pass the live NVIDIA transaction evaluation gate.
  - Acceptance: one explicit command evaluates the versioned cases sequentially,
    prints sanitized per-field findings, and exits unsuccessfully on any failed
    golden case without logging the credential or raw provider response.
  - Verify: first baseline records 3/5; shared prompt corrections make the same
    five cases pass without weakening evaluator expectations.

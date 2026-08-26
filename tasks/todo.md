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

- [ ] Select authentication before implementing persisted onboarding.
  - Acceptance: session identity is server-resolved and credential endpoints have an approved security design.
  - Verify: authentication ADR and abuse-case tests exist before financial endpoints.

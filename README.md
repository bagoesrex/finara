# Finara

Finara is a mobile-first personal finance tracker for Indonesian users. It
combines precise PostgreSQL-backed transactions and Budgets with concise AI
transaction previews and current-month financial questions.

The product requirements live in [`docs/PRD.md`](./docs/PRD.md). The accepted
portfolio boundary is summarized in
[`docs/mvp-specification-audit.md`](./docs/mvp-specification-audit.md).

## Local setup

Requirements:

- Bun 1.4.0
- PostgreSQL
- stable Microsoft Edge for browser tests
- an NVIDIA Build key only for optional live AI checks

Copy `.env.example` to an ignored `.env`, provide a local `DATABASE_URL` and a
random `BETTER_AUTH_SECRET`, then install and migrate:

```bash
bun ci
bun run db:migrate:deploy
bun run dev
```

Open `http://localhost:3000`.

## Quality gates

Run deterministic checks sequentially because test, typecheck, and build each
regenerate the same Prisma client:

```bash
bun run test
bun run test:integration
bun run lint
bun run typecheck
bun audit --prod --audit-level=high
bun run build
bun run e2e
```

The production build uses Next.js' documented Webpack fallback. On Windows,
Turbopack's PostCSS worker currently forwards Bun's `--bun` runtime option to a
Node subprocess, which exits before compilation can finish.

`test:integration` requires a migrated PostgreSQL database. `e2e` additionally
requires `DATABASE_URL` to use `localhost`, `127.0.0.1`, or `::1`; it refuses a
remote database, builds the production application, creates isolated test users,
and removes them after each journey.

If port 3000 is occupied, PowerShell can select another validated port:

```powershell
$env:FINARA_E2E_PORT = "3100"
bun run e2e
```

Live NVIDIA checks are intentionally opt-in and stay outside pull-request CI:

```bash
bun run ai:check:nvidia
bun run ai:eval:transactions
```

GitHub Actions repeats frozen installation, migrations, deterministic tests,
runtime dependency audit, lint, type checking, production build, and all Edge
journeys against an ephemeral PostgreSQL service.

# Frontend MVP Tasks

- [ ] Install UI/test dependencies.
  - Acceptance: `lucide-react` and Vitest are installed without an animation runtime.
  - Verify: package lock is updated and `npm run test` exists.
  - Files: `package.json`, `package-lock.json`, `vitest.config.ts`.

- [ ] Create and test the dummy finance domain.
  - Acceptance: formatting, natural-language parsing, search, and date grouping are deterministic.
  - Verify: `npm run test`.
  - Files: `src/lib/mock-data.ts`, `src/lib/finance.ts`, `src/lib/finance.test.ts`.

- [ ] Build the responsive application shell.
  - Acceptance: mobile container, persistent navigation, focus states, and reduced motion work.
  - Verify: lint, typecheck, and responsive browser review.
  - Files: layouts, global CSS, navigation components.

- [ ] Build Home and AI transaction preview.
  - Acceptance: summary, recent activity, parsing preview, cancel, and local save work without silent persistence.
  - Verify: unit tests plus browser interaction.
  - Files: Home page and focused Home components.

- [ ] Build supporting primary pages.
  - Acceptance: Activity/search/detail, Budget, and Profile are navigable and use shared dummy data.
  - Verify: browser route and keyboard checks.
  - Files: App Router pages and focused presentation components.

- [ ] Complete quality gates.
  - Acceptance: test, lint, typecheck, build, runtime, accessibility, and performance checks pass.
  - Verify: repository commands and real-browser inspection where available.

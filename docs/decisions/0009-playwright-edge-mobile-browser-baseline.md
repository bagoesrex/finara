# ADR 0009: Playwright with a Mobile Edge Browser Baseline

**Status:** Accepted
**Date:** 2026-09-01
**Decision owner:** Product owner

## Context

Finara's quality specification requires real-browser evidence for responsive,
accessible transaction behavior. Unit tests, production HTTP checks, and
server-rendered HTML verify important boundaries, but they do not prove that a
new user can complete the client-side registration, onboarding, mutation, and
cross-page navigation journey in a rendered browser.

The Chrome DevTools MCP integration is not configured in the current
environment and would provide interactive session evidence rather than a
repeatable repository gate. Next.js 16.3.2 documents Playwright for end-to-end
testing and recommends testing production code; Playwright documents `webServer`,
mobile device emulation, stable Microsoft Edge channels, and failure traces.
See the [Next.js Playwright guide](https://nextjs.org/docs/app/guides/testing/playwright),
[Playwright web-server configuration](https://playwright.dev/docs/test-webserver),
and [Playwright browser projects](https://playwright.dev/docs/browsers#run-tests-on-different-browsers).

## Decision

- Use `@playwright/test` as Finara's repository-owned browser end-to-end runner.
- Establish one initial automation environment: stable Microsoft Edge using
  Playwright's Pixel 7 device descriptor, Indonesian locale, and
  `Asia/Jakarta` timezone.
- Make `npm run e2e` build the production application, start it on
  a validated loopback port (`3000` by default), run one worker with no retries,
  and return a normal pass/fail exit code. `FINARA_E2E_PORT` may isolate the gate
  from an existing developer server.
- Cover the highest-value happy path first: register, create the first account,
  open manual transaction entry, save a `Rp25.000` expense, and find it on Home
  and Activity without a reload.
- Treat the configured PostgreSQL database as a mutation boundary. The runner
  refuses non-loopback database hosts, generates a unique non-deliverable test
  identity, parameterizes cleanup queries, and refuses to delete identities
  outside the E2E naming pattern.
- Preserve a successful mobile screenshot for visual inspection. On failure,
  retain Playwright's screenshot and trace while capturing browser console
  warnings, console errors, and uncaught page errors as test failures.
- Keep CI integration, additional browsers/devices, recoverable-failure flows,
  and a representative network profile as later quality increments.

## Verification expansion (2026-09-01)

The same accepted Edge baseline now also covers recoverable transaction and
Budget saves, Activity search/detail/pagination, transaction edit/delete,
account rename and sign-out, and deterministic AI preview/answer UI behavior.
Responsive smoke checks exercise `320x700` and `1440x900` while preserving the
single mobile information architecture. The AI journey records deterministic
UI parsing handoff and real PostgreSQL persistence separately; live NVIDIA
latency remains outside the pull-request-safe browser gate.

## Consequences

- The critical persisted transaction journey is now reproducible from one
  documented command instead of relying only on source review or SSR evidence.
- Local E2E runs require a loopback PostgreSQL database and stable Microsoft
  Edge. The dedicated Playwright context does not reuse a developer's browser
  profile or authenticated tabs.
- The production build makes the gate slower than a unit test but closer to the
  application boundary users receive.
- The expanded baseline is intentionally not a cross-browser compatibility or
  live-provider performance claim. Other browser engines and representative
  network profiles remain later quality increments.

## Alternatives considered

### Depend on Chrome DevTools MCP only

Rejected as the repository gate because the connector is unavailable in this
environment and interactive verification is not automatically repeatable by a
future developer or CI worker. It remains useful for targeted diagnosis when
configured.

### Download Playwright's bundled Chromium immediately

Deferred because stable Edge is already installed and is an officially
supported Playwright channel. Bundled Chromium remains a good candidate for a
future hermetic CI project when the CI environment is selected.

### Use Cypress

Rejected for this baseline because Playwright directly supports the installed
Edge channel, device emulation, failure traces, and Next.js-managed web-server
startup with a smaller configuration for this flow.

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
  `http://localhost:3000`, run one worker with no retries, and return a normal
  pass/fail exit code.
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

## Consequences

- The critical persisted transaction journey is now reproducible from one
  documented command instead of relying only on source review or SSR evidence.
- Local E2E runs require a loopback PostgreSQL database and stable Microsoft
  Edge. The dedicated Playwright context does not reuse a developer's browser
  profile or authenticated tabs.
- The production build makes the gate slower than a unit test but closer to the
  application boundary users receive.
- The initial baseline is intentionally not a cross-browser compatibility
  claim and does not yet satisfy every transaction/Budget failure case in the
  broader quality matrix.

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

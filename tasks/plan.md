# Implementation Plan: Dummy-data Frontend MVP

## Overview

Build a navigable, mobile-first Finara frontend for Home, Activity, Budget, and Profile using deterministic dummy data. Preserve server rendering for static presentation and isolate client JavaScript to navigation state, search, and the local AI-composer interaction.

## Architecture decisions

- Keep mock records and domain types in `src/lib/`, independent from React, so a future API can replace the data source.
- Use Server Components for route pages and narrow Client Components for interactive islands.
- Use CSS/Tailwind transitions based on `transform` and `opacity`; avoid an animation runtime dependency.
- Respect `prefers-reduced-motion` and preserve clear state changes without animation.
- Use the four-route App Router structure `/`, `/activity`, `/budget`, and `/profile`.
- Use Vitest for deterministic mock parsing/search/formatting logic.

## Task list

### Phase 1: Foundation

- [ ] Add Vitest and Lucide dependencies plus repository test command.
- [ ] Define mock transaction/budget/profile data and finance utilities.
- [ ] Prove formatting, parsing, grouping, and search behavior with unit tests.

### Checkpoint: Foundation

- [ ] Focused and full tests pass.
- [ ] TypeScript contracts compile.

### Phase 2: Shell and core flow

- [ ] Define Finara visual tokens, base accessibility styles, and reduced-motion behavior.
- [ ] Add centered mobile shell and persistent bottom navigation.
- [ ] Build Home financial hierarchy and local AI preview/save interaction.

### Checkpoint: Core flow

- [ ] Home works at 320-480px and remains centered on desktop.
- [ ] Input is preserved on parse failure and no save occurs before confirmation.

### Phase 3: Supporting pages

- [ ] Build Activity list, client-side search, and dummy transaction detail.
- [ ] Build monthly/category Budget progress.
- [ ] Build minimal Profile/settings navigation.

### Checkpoint: Complete

- [ ] All primary routes are navigable and have correct active states.
- [ ] Keyboard, responsive, and reduced-motion behavior are verified.
- [ ] Test, lint, typecheck, and production build pass.
- [ ] Runtime console is clean and performance has a measured baseline where tooling permits.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Excess client JavaScript | Slower hydration | Keep pages server-rendered and use narrow interactive islands. |
| Motion causes jank | Poor interaction quality | Animate compositor-friendly properties and keep durations short. |
| Dummy data couples to UI | Expensive API migration | Centralize serializable domain types/data in `src/lib`. |
| Experimental transition API | Browser/version instability | Use CSS motion now; treat View Transitions as progressive enhancement later. |
| Visual polish harms accessibility | Excludes users | Semantic HTML, focus-visible styles, contrast, and reduced motion. |

## Open questions deferred

- Authentication UI and onboarding are not connected in this frontend slice.
- Manual transaction entry beyond the AI preview is deferred.
- Dark mode remains out of scope until the product decision is accepted.
- Dummy saves are session-local and reset on refresh.

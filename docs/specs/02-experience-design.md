# Spec: Experience and Design System

**Status:** Accepted for MVP
**PRD source:** Sections 5, 7-12, 34-41, 49-53

## Objective

Create a calm, clean, precise, and slightly playful interface that communicates financial information quickly. AI capability must be visible through behavior rather than decorative visual language.

## Layout requirements

- **UX-001:** The application fills the viewport below `480px` and uses a centered container with an approximate maximum width of `420-480px` above that breakpoint.
- **UX-002:** Tablet and desktop layouts preserve the mobile information architecture; they do not introduce a sidebar or wide enterprise dashboard.
- **UX-003:** Layouts account for safe areas, persistent bottom navigation, virtual keyboards, and `100dvh` behavior.
- **UX-004:** Primary content remains readable without horizontal scrolling at supported viewport widths.

## Visual language

- **UX-005:** Typography, spacing, and dividers are the default hierarchy tools.
- **UX-006:** Cards are used only when content needs a meaningful grouped boundary; nested cards are prohibited.
- **UX-007:** The palette uses neutral background/foreground values, muted text, subtle borders, one primary accent, and semantic income/expense/warning/success colors.
- **UX-008:** Category identity uses icon plus text instead of a unique bright gradient or badge for every category.
- **UX-009:** Border radii follow restrained roles: buttons about `12-14px`, inputs `14-16px`, cards `16-20px`, and sheets about `24px`.
- **UX-010:** Pill shapes are limited to controls such as compact filters, status labels, and selectors.
- **UX-011:** One icon library is used consistently; Lucide is the preferred choice from the PRD.

## Prohibited patterns

- Generic purple-blue gradients and random gradient backgrounds.
- Glowing borders, floating orbs, decorative blobs, or excessive glass effects.
- Sparkles used as a default AI signifier.
- Generic robot/assistant avatars.
- Decorative animation without state meaning.
- Excessive statistics, badges, pills, or heading/subtitle pairs.

## Content requirements

- **UX-012:** Labels and headings use the shortest wording that remains unambiguous, such as `Spent` instead of `Total Expenses This Month`.
- **UX-013:** AI feedback omits greetings, self-congratulation, and conversational filler.
- **UX-014:** Financial copy is factual and non-judgmental.
- **UX-015:** Amount, label, period, and status hierarchy remains clear without relying only on color.

## Component behavior

- **UX-016:** Bottom sheets host short contextual actions such as add transaction, filter, category selection, and account selection.
- **UX-017:** Empty states teach the next action with one short example and no mandatory large illustration.
- **UX-018:** Standard loading uses a subtle skeleton or spinner; AI parsing may use the short label `Understanding...`.
- **UX-019:** Motion is brief and tied to state transitions such as insertion, navigation, progress updates, and sheet opening.
- **UX-020:** Reduced-motion preferences disable non-essential transitions.

## Accessibility requirements

- Interactive controls have accessible names and visible keyboard focus.
- Touch targets are large enough for reliable mobile interaction.
- Text and meaningful status indicators meet WCAG AA contrast expectations.
- Semantic headings and landmarks describe the page structure.
- Income and expense meaning is not communicated by color alone.
- Sheets manage focus on open/close and remain keyboard operable.

## Acceptance criteria

- Screens at `320px`, `480px`, `768px`, and `1024px` preserve the centered mobile-first architecture.
- A design review finds no prohibited AI-slop pattern.
- Empty, loading, success, and error states are specified for every data-dependent surface.
- Primary tasks can be completed with keyboard-only navigation.
- Reduced-motion mode remains understandable without animation.

## Accepted MVP design boundary

- Typography uses the committed `"Segoe UI", Arial, sans-serif` system stack;
  the MVP does not add a bundled font dependency.
- The accent and semantic colors in `src/app/globals.css` are the accepted light
  tokens. Dark mode is deferred until it has a separately reviewed palette.
- The supported minimum is 320 CSS pixels. Edge smoke checks exercise
  320/480/768/1024/1440 widths while keeping the shell at or below 480 pixels.
- A broader browser/device matrix is optional future evidence rather than a
  portfolio completion requirement.

See [ADR 0011](../decisions/0011-portfolio-mvp-as-the-acceptance-boundary.md).

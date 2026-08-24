# Spec: Quality and Success Metrics

**Status:** Draft  
**PRD source:** Sections 34-36, 58-60

## Objective

Define evidence that Finara is fast, accurate, understandable, safe, and maintainable. Feature count is not a quality metric; successful resolution of the core tracking problem is.

## Product metrics

### Time to transaction

- **QUAL-001:** Measure elapsed time from submitting transaction input to persisted success.
- **QUAL-002:** The primary target is less than 10 seconds under the documented test conditions.
- **QUAL-003:** Report AI parsing time separately from confirmation and persistence time so regressions are diagnosable.

### Interaction count

- **QUAL-004:** A high-confidence AI transaction takes one input submission plus one confirmation at most during MVP.
- **QUAL-005:** Corrections are measured separately and feed parsing-quality analysis.

### AI parsing success

- **QUAL-006:** Parsing success means all required persisted fields are correct without user edits.
- **QUAL-007:** Accuracy is evaluated against a versioned representative Indonesian input dataset, including shorthand amounts and relative dates.
- **QUAL-008:** Track failure by field and phrase pattern rather than only one aggregate percentage.

### Continued tracking

- **QUAL-009:** Week-one tracking measures users who record a meaningful transaction after their first-use week boundary.
- **QUAL-010:** The exact event definition, cohort window, and target percentage must be approved before analytics implementation.

## Functional verification matrix

| Concern | Minimum evidence |
| --- | --- |
| Money/date/category calculation | Unit tests with boundary cases |
| Authorization and ownership | Integration tests using at least two users |
| Database constraints and queries | Integration tests against PostgreSQL |
| Transaction and budget flows | End-to-end happy path plus recoverable failure |
| AI structured parsing | Deterministic schema tests and evaluation dataset |
| AI tool authorization | Integration tests with hostile/mismatched identifiers |
| Responsive and accessible UI | Real-browser checks at supported viewports |
| Build and type safety | Lint, route-aware typecheck, production build |

The test framework is not yet selected. Tests should be added with the first business-logic implementation rather than creating an unused test architecture.

## UX state quality

- **QUAL-011:** Every data-dependent surface defines loading, empty, populated, and failure behavior.
- **QUAL-012:** AI entry additionally defines parsing, ambiguous, confirmation, provider-failure, and save-failure states.
- **QUAL-013:** Errors preserve recoverable user input and identify a useful next action.
- **QUAL-014:** Motion communicates state and respects reduced-motion preferences.

## Performance requirements

- Home must make its primary balance and spending state understandable within the product's five-second goal.
- Transaction entry must meet the measured sub-10-second product target under the accepted device/network profile.
- List and search queries require pagination or bounded result sets before realistic data volume can make responses unbounded.
- LLM latency, server processing, and client rendering must be measured separately.
- Performance optimization begins with measurement; no speculative cache is added without a demonstrated bottleneck and correctness policy.

## Accessibility requirements

- Keyboard operation and logical focus order for all primary flows.
- Accessible names for controls and meaningful status announcements.
- Semantic landmark and heading structure.
- WCAG AA contrast for text and meaningful components.
- Status meaning independent of color.
- Touch targets appropriate for mobile use.
- Reduced-motion behavior for non-essential animation.

## Security and privacy verification

- Cross-user access tests for every private resource type.
- Validation tests for client and AI-produced input.
- Secret scanning and environment-file exclusions before commit.
- Log review using representative sensitive transaction content.
- Dependency and vulnerability review when packages change.
- Provider-failure tests that confirm authoritative data remains consistent.

## Definition of done

A feature is ready for handoff when:

1. Its spec has no blocking open question for the implemented behavior.
2. Acceptance criteria are mapped to automated or explicit manual checks.
3. Relevant unit, integration, end-to-end, and AI evaluation checks pass.
4. `npm run lint` and `npm run typecheck` pass.
5. `npm run build` passes for routing, rendering, configuration, or dependency changes.
6. Browser-facing behavior is verified in a real browser when tooling is available.
7. Loading, empty, error, keyboard, responsive, and reduced-motion behavior is reviewed where relevant.
8. No secret, unnecessary sensitive log, Phase 2 scope, or unrelated refactor is included.
9. Documentation and accepted decisions are updated with the behavior.

## Acceptance criteria

- Every MVP spec points to measurable acceptance criteria.
- The parsing evaluation dataset covers all natural-language examples in the PRD.
- Authorization tests demonstrate that user A cannot access user B's finance records.
- Product metrics have unambiguous event definitions before production analytics collection.
- Quality gates can run locally and later in CI without relying on undocumented steps.
- Failed quality checks block feature completion rather than being documented as known-good warnings.

## Open questions

- Test runners for unit/integration and browser end-to-end tests.
- Supported browser/device matrix and representative network profile.
- Quantitative AI parsing-success target.
- Week-one tracking target and analytics provider.
- Performance budgets beyond time-to-transaction and Home comprehension.
- CI quality-gate configuration and required checks.

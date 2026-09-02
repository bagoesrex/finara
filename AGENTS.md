<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Finara Project Context

## Source of Truth

- The complete product specification lives in `docs/PRD.md`.
- Read only the relevant PRD sections before implementing a feature.
- If this file and the PRD conflict, the PRD takes precedence unless a newer explicit decision is documented.
- Do not invent product behavior when the PRD is silent. Surface the missing decision before implementing behavior that is difficult to reverse.

## Product

Finara is an AI-powered personal finance tracker for people who want to record and understand their money without using accounting software. Its core interaction should feel as quick as sending a message: a user enters `makan 25rb`, reviews the parsed transaction, and saves it.

Primary users are Indonesian mobile-first users aged roughly 18-35, including students, fresh graduates, young professionals, and freelancers. Product copy may use concise Indonesian examples even when code identifiers remain English.

Product principles:

1. Simple before powerful.
2. Mobile-first.
3. AI is an interaction layer, not a separate generic chatbot.
4. Prefer information, speed, and clarity over decoration.
5. Every element and interaction must earn its place.

Key targets:

- A transaction should be recorded in under 10 seconds.
- AI transaction entry should take one or two primary interactions.
- Home should communicate the user's financial state in under five seconds.
- AI output must be concise, factual, calm, contextual, and free of conversational filler.

## MVP Scope

Build only the MVP unless the task explicitly expands scope:

- Authentication and initial account setup.
- Home with available balance, current-month spending, AI composer, and recent transactions.
- Manual and AI-assisted income/expense entry with confirmation before save.
- Accounts and expense/income categories.
- Activity history, transaction detail/edit/delete, and lightweight search.
- Monthly and category budgets with simple progress.
- Basic natural-language financial questions backed by stored data.
- Minimal profile and settings.

Do not add investment tracking, crypto, bank synchronization, complex debt management, tax, invoicing, business bookkeeping, accounting reports, financial news, social features, or a marketplace during MVP work.

## UX and Visual Constraints

- Design for mobile first with a centered application container of approximately `420-480px` maximum width. Larger breakpoints keep the same mobile information architecture; do not add a desktop dashboard or sidebar merely to fill space.
- Primary navigation has at most four items: Home, Activity, Budget, and Profile. The AI composer belongs in the core Home flow.
- Favor typography, whitespace, dividers, and simple lists. Use cards only for meaningful grouping; avoid cards nested inside cards.
- Use one restrained accent color and semantic status colors only when they convey meaning.
- Avoid generic AI aesthetics: purple-blue gradients, ubiquitous sparkles, glowing borders, excessive glassmorphism, decorative blobs, robot mascots, and ornamental animation.
- Use short labels and copy. Avoid long headings, filler, and judgmental financial language.
- Motion must explain a state change, such as a saved transaction or an opened bottom sheet.
- Accessibility, keyboard behavior, touch targets, reduced motion, focus visibility, and semantic HTML are acceptance requirements, not polish.

## Application Architecture

The intended system boundary is:

```text
Next.js client -> application backend -> PostgreSQL
                                  `-> LLM with structured output/tool calling
```

- PostgreSQL is the source of truth for balances, transactions, budgets, and financial summaries.
- Never use AI conversation memory as financial state.
- AI parses natural language and invokes narrowly scoped server tools such as `create_transaction`, `get_transactions`, `get_balance`, `get_budget`, and `get_spending_summary`.
- AI-created transactions require a preview/confirmation step in the MVP. Do not add auto-save unless explicitly requested.
- MCP is a post-MVP option, not a required dependency. Prefer normal structured output and tool calling first.
- Keep static AI instructions modular when AI work begins, following the PRD's suggested `ai/` prompt structure.

## Core Domain Model

Core entities are `User`, `Account`, `Transaction`, `Category`, and `Budget`.

`Transaction` minimally contains:

```text
id, userId, accountId, categoryId, type, amount, description,
transactionDate, createdAt, updatedAt
```

- `type` is `INCOME` or `EXPENSE`.
- A user owns accounts, transactions, categories, and budgets.
- An account has many transactions.
- A category has many transactions and may have a budget.
- Store currency amounts in a precise database representation; never use floating-point arithmetic for money.
- Derive financial summaries from authorized database data rather than trusting values produced by an LLM.

The opening-balance behavior is settled by `docs/decisions/0001-current-balance-as-opening-snapshot.md`: onboarding records the account's current balance as an opening snapshot and does not create an artificial income transaction. The exact database representation remains open.

The PRD does not yet settle transfers, currency strategy, timezone behavior, category ownership, soft deletion, or the complete budget schema. Treat these as explicit design decisions, not implied requirements.

## Security and Privacy Boundaries

- Authenticate and authorize on the server. Every financial query and mutation must be scoped to the current user.
- Never trust a client-provided `userId` for authorization.
- Keep secrets and provider API keys server-only; never commit `.env*` files containing secrets.
- Send the minimum data required to the LLM. Never place a user's entire financial dataset into a prompt by default.
- Do not log sensitive transaction or AI prompt data without a documented operational need and redaction policy.
- Validate all external and AI-produced data before persistence.
- AI may summarize the user's data but must not present absolute professional financial advice.

## Current and Planned Stack

Current scaffold:

- Next.js 16 App Router.
- React 19 and TypeScript in strict mode.
- Tailwind CSS 4.
- ESLint 9 with the Next.js Core Web Vitals and TypeScript rules.
- Bun 1.4.0 and the `@/*` alias mapped to `src/*`.

Planned by the PRD but not installed or selected yet:

- PostgreSQL.
- Prisma ORM; do not choose silently when database work begins.
- Zod for validation.
- An LLM provider supporting structured output and tool calling.

## Engineering Conventions

- Prefer Server Components. Add `"use client"` only when browser APIs, client state, or event handlers require it.
- Keep route-specific code close to its App Router route. Extract shared code only after there is a real reuse boundary.
- Use clear domain names in English for files, types, and identifiers.
- Keep TypeScript strict and avoid `any`; validate untrusted boundaries.
- Keep financial calculations and authorization in server-side domain/application code, not UI components.
- Do not expose database models directly as public API contracts.
- Add tests for new business logic and regression tests for bug fixes.
- Keep changes narrowly scoped. Do not add Phase 2 features or speculative abstractions.

## Commands

```bash
bun run dev
bun run lint
bun run typecheck
bun run build
bun run start
```

Before handing off a code change, run lint, type checking, and the relevant tests. Run a production build for changes that affect routing, configuration, rendering boundaries, or dependencies.

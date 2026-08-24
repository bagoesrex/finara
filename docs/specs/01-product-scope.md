# Spec: Product Scope

**Status:** Draft  
**PRD source:** Sections 1-4, 45-47, 58-60

## Objective

Finara is a mobile-first personal finance tracker that makes recording money feel as quick as sending a message. It serves Indonesian users aged roughly 18-35 who want practical tracking and simple insight without accounting complexity.

The product must feel like a finance application with an intelligent interaction layer, not a generic chatbot or an AI demonstration.

## User outcomes

- A user can record an income or expense without navigating a long form.
- A user can understand available money and current spending within seconds.
- A user can inspect transaction history and basic budgets without accounting terminology.
- A user can ask concise natural-language questions about their own stored financial data.

## Requirements

- **PROD-001:** The primary transaction flow completes in one or two main interactions after the user provides input.
- **PROD-002:** The application prioritizes mobile usage and remains a centered mobile-width experience on larger screens.
- **PROD-003:** AI acts as an input and query layer over persisted financial data.
- **PROD-004:** PostgreSQL data, not AI memory, determines balances, transactions, budgets, and summaries.
- **PROD-005:** Product language is concise, familiar, non-judgmental, and avoids professional-accounting jargon.
- **PROD-006:** Every MVP feature must directly support recording, reviewing, budgeting, or understanding personal money.

## MVP scope

- Authentication and first-account onboarding.
- Home and available-balance overview.
- Manual and AI-assisted income/expense creation.
- Category and account management.
- Activity history, transaction search, detail, edit, and delete.
- Monthly budget progress.
- Basic AI questions grounded in the user's transaction and budget data.
- Minimal profile and settings.

## Explicit non-goals

- Investment, stock, or crypto tracking.
- Bank synchronization.
- Complex debt management, tax, invoicing, or business bookkeeping.
- Accounting statements and professional reporting.
- Social features, marketplace, or financial news.
- MCP as an MVP dependency.
- Recurring transactions, financial goals, export, PWA, and notifications before Phase 2.

## Product boundaries

- Prefer removing a step over explaining why it exists.
- Do not add an analytics surface merely because data is available.
- Do not expand a personal-finance feature into business accounting.
- Do not present AI output as professional financial advice.

## Acceptance criteria

- A representative AI-assisted transaction can be saved in under 10 seconds.
- A high-confidence AI parse needs no more than one confirmation after input.
- A new user understands the Home balance and monthly spending without onboarding explanation.
- All shipped MVP capabilities map to the scope above; no explicit non-goal appears in navigation or settings.
- Product usability can be measured through time-to-transaction, parsing success, and week-one continued tracking.

## Open questions

- Which exact locale and currency combinations are supported at MVP launch?
- Is the launch language Indonesian only, or must English be available immediately?
- What quantitative target defines successful week-one retention?
- Which transaction samples form the baseline dataset for measuring parsing success?

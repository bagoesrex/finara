# Spec: Architecture, Security, and Privacy

**Status:** Draft  
**PRD source:** Sections 27-29, 51, 56-57

## Objective

Define system boundaries that keep financial data authoritative, user-scoped, and diagnosable while allowing AI-assisted interaction without granting the model direct trust or broad data access.

## Intended stack

- Next.js 16 App Router and React 19.
- TypeScript in strict mode.
- Tailwind CSS 4.
- Next.js server capabilities / Node.js application backend.
- PostgreSQL with Prisma ORM.
- Zod for untrusted-boundary validation when installed.
- An LLM provider with structured output and tool calling.

Only the frontend scaffold is currently installed. Database, Prisma, Zod, authentication, and LLM packages require separate implementation decisions and dependency changes.

## System boundary

```text
Browser
  |
  v
Next.js application
  |-- server-side authentication and authorization
  |-- domain/application services
  |-- Prisma -> PostgreSQL (source of truth)
  `-- AI orchestration -> validated, narrow server tools
```

The browser never connects directly to PostgreSQL or the LLM with a secret provider credential. The LLM never receives unrestricted database access.

## Application requirements

- **ARCH-001:** Server Components are the default; Client Components are limited to browser APIs, client state, or event-driven interactions.
- **ARCH-002:** Every financial read and mutation resolves the authenticated user on the server.
- **ARCH-003:** Public input contracts are separate from Prisma models and are validated before application logic.
- **ARCH-004:** Financial calculations are centralized in server-side functions reused by UI and AI tools.
- **ARCH-005:** Database transactions are used when a mutation must update multiple authoritative records atomically.
- **ARCH-006:** Errors cross boundaries in a sanitized, stable shape without stack traces or secrets.
- **ARCH-007:** External-provider calls have explicit timeouts and bounded retries appropriate to their idempotency.

## Request flows

### Deterministic financial read

```text
request -> authenticate -> validate filters -> apply user scope -> query PostgreSQL -> calculate/format -> response
```

### Transaction mutation

```text
request -> authenticate -> validate -> verify account/category ownership -> persist -> invalidate/reload affected summaries
```

### AI financial query

```text
input -> authenticate -> classify/structure -> validate tool arguments -> authorized tool -> PostgreSQL -> concise response
```

### AI transaction entry

```text
input -> structured parse -> validate/map category -> preview -> user confirms -> normal transaction mutation
```

## Authorization requirements

- **ARCH-008:** Never authorize from a `userId` supplied by the client or model.
- **ARCH-009:** Resource lookup combines resource identity with authenticated ownership, or performs an equivalent explicit ownership check.
- **ARCH-010:** Account, category, transaction, and budget relations are revalidated during mutations.
- **ARCH-011:** Missing and unauthorized private resources use responses that do not disclose another user's record existence.

## AI and data minimization

- **ARCH-012:** Prompts receive only the fields and aggregate granularity needed for the current request.
- **ARCH-013:** The full user database is never embedded in a prompt by default.
- **ARCH-014:** AI output is untrusted input and must pass the same validation as manual input.
- **ARCH-015:** Conversation memory cannot serve as balance, budget, or transaction storage.
- **ARCH-016:** MCP is deferred until normal tool calling is insufficient and an accepted ADR justifies the added boundary.

## Secrets and configuration

- Provider keys, database URLs, session secrets, and encryption material remain server-only.
- Real environment files and secrets are not committed.
- Startup or request boundaries fail clearly when required configuration is absent.
- Example environment documentation contains names and safe placeholders only.

## Logging and privacy

- **ARCH-017:** Logs avoid raw transaction descriptions, full prompts, model responses, credentials, tokens, and unnecessary personal data.
- **ARCH-018:** Operational logs use request/correlation identifiers and safe event metadata.
- **ARCH-019:** AI logging, retention, and redaction are documented before production data is processed.
- **ARCH-020:** Data deletion, export, and retention behavior must match the supported product capability and applicable policy before launch.

## Suggested source boundaries

Exact directories may evolve, but responsibilities should remain distinct:

```text
src/app/          routes, layouts, server entry points
src/components/   shared UI components
src/features/     domain-facing feature UI and orchestration
src/lib/          shared infrastructure and validation
src/server/       auth, application services, database, AI tools
prisma/           schema and migrations
ai/               static modular prompt instructions
```

Do not create all directories preemptively; introduce a boundary when its first real implementation requires it.

## Acceptance criteria

- Browser bundles contain no server credential or database client.
- Every private query and mutation has a demonstrable server-side user scope.
- Manual UI and AI tools reuse the same validation and financial calculation rules.
- A malformed or adversarial model response cannot persist invalid data.
- Logs and user-facing errors contain no secret or unnecessary raw financial content.
- Provider outages degrade to a safe retry/manual path without corrupting authoritative state.
- Architecture remains functional without MCP in MVP.

## Open questions

- Authentication provider and session implementation.
- LLM provider and regional/data-processing terms.
- Hosting, managed PostgreSQL provider, and deployment regions.
- API style for client mutations: Server Actions, Route Handlers, or a deliberate mix.
- Rate limits for authentication, AI, search, and mutations.
- Encryption, retention, deletion, and backup policies.
- Observability vendor and redaction controls.

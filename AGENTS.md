# Finara Agent Instructions

## 1. Project Context & Source of Truth

- **Product Vision & Requirements:** `docs/PRD.md`
- **Technical Architecture & Data Model:** `docs/ARCHITECTURE.md`
- **Design System & UI Guidelines:** `docs/DESIGN.md`
- Always read the relevant sections in `docs/` before making architectural or UI decisions.
- Do not invent product behavior when the specs are silent.

---

## 2. Monorepo Layout (Option B: Flat Root)

```text
finara/
├── client/                     # Frontend: React 19 + Bun + Vite + Tailwind CSS 4
├── server/                     # Backend: Go 1.24+ (Echo v4, pgx/v5, Clean Architecture)
├── e2e/                        # End-to-End Tests: Playwright (Mobile Viewport)
├── docs/                       # PRD, Architecture, and Design documentation
├── AGENTS.md                   # This instruction file
└── README.md                   # Project overview and setup commands
```

---

## 3. Go Backend Guidelines (`server/`)

1. **Clean Architecture Separation:**
   - `internal/domain`: Pure entities, value objects, and repository interfaces. Must not import external web frameworks or database drivers.
   - `internal/usecase`: Business logic. Takes domain entities and repository interfaces. Every operation must enforce user ownership via `userID`.
   - `internal/repository/postgres`: SQL execution using `pgx/v5` (or `sqlc`). Handles database transactions and mapping to domain models.
   - `internal/delivery/http`: Echo handlers and middlewares. Validates JSON payload, maps usecase results to standard HTTP responses, and handles HTTP status codes.
   - `internal/ai`: Generic OpenAI-compatible chat completions client.

2. **Money and Precision:**
   - All financial amounts in Go are `int64` representing exact Indonesian Rupiah (IDR).
   - **Never** use floating-point numbers (`float64`, `float32`) for monetary arithmetic.

3. **Security & Multitenancy:**
   - Every financial query and mutation must be scoped to the authenticated `user_id`. Never trust user IDs provided in the request body.
   - Use parameterized SQL queries (`$1, $2, ...`) at all times.

4. **Error Handling:**
   - Define sentinel domain errors in `internal/domain/errors.go` (e.g. `ErrNotFound`, `ErrUnauthorized`, `ErrDuplicateRequest`).
   - Handlers map domain errors to standard HTTP status codes (400, 401, 403, 404, 409, 422, 500) without leaking database stack traces to the client.

5. **AI Inference & Zero-Trust Boundary:**
   - AI output is an untrusted draft. Always validate parsed AI output with Go structs.
   - AI transactions are returned to the client as drafts; **never** persist directly to the database without explicit user confirmation.

---

## 4. Frontend Guidelines (`client/`)

1. **Stack:**
   - React 19, TypeScript strict mode, Bun runtime & package manager, Vite, Tailwind CSS 4, Lucide React.

2. **TanStack Query Persistence (Zero-Reload Policy):**
   - Use `@tanstack/react-query-persist-client` with local storage or IndexedDB persistence.
   - When users open the app or switch routes, data must render immediately from the persisted cache without showing blank screens or triggering full page reloads.
   - Apply optimistic updates when recording or deleting transactions, with safe rollback on error.
   - Targeted invalidation: only invalidate queries affected by the mutation.

3. **Design, Mobile-First & Input Constraints:**
   - Max container width: `440px` centered on larger screens.
   - Minimum touch target: `44x44px` with at least `8px` spacing.
   - Respect safe area insets for notches and mobile home bars.
   - **Zero Onboarding:** Registration transitions directly to Home without onboarding wizards.
   - **Custom-Styled Fields (Never Default HTML):** All inputs must use elevated surfaces (`bg-[#1A1D2B]` / `bg-[#F1F5F9]`), 48px-52px height, 14px rounded corners, integrated currency prefix (`Rp`), and emerald focus rings (`focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500`).
   - **Strict Numeric Inputs:** All currency/amount input fields must specify `inputMode="numeric"` and `pattern="[0-9]*"` to trigger numeric keypads on mobile. Block all non-digit characters (`-`, `+`, `,`, `.`, letters) and disallow negative values (< 0).
   - **Typography & Glanceable UI:** Input text must be 16px (to prevent mobile Safari auto-zoom). Display amounts must be 28px-32px bold tabular numbers. Disallow text bloat—use concise 1-3 word labels and action buttons ("Simpan", "Batal", "Hapus") without walls of instructional text.
   - Anti-slop: strictly adhere to `docs/DESIGN.md` (no emojis in markdown, no generic purple-blue gradients, no decorative sparkles, no cards inside cards, tabular numbers for currency).

---

## 5. Playwright E2E Testing (`e2e/`)

- Test real user flows on mobile viewports (`Pixel 7` and `iPhone 14`).
- Critical flows to cover:
  1. Registration and instant jump to Home (Zero Onboarding).
  2. Recording a transaction via natural language AI composer.
  3. Recording a transaction manually with strict numeric keypad validation.
  4. Setting up a category monthly budget and checking progress.
  5. Verifying zero-reload persisted cache on navigation.

---

## 6. Development Commands

### Backend (Go):
```bash
cd server
go run cmd/api/main.go
go test -v ./...
```

### Frontend (Bun + React):
```bash
cd client
bun install
bun run dev
bun run build
bun test
```

### End-to-End Tests:
```bash
cd e2e
bun install
bun run test
```

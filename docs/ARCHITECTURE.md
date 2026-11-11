# Finara Technical Architecture

## 1. High-Level System Overview

Finara mengadopsi pola arsitektur **Decoupled Client-Server Monorepo**:

```text
                  ┌──────────────────────────────────────────────┐
                  │                 CLIENT                      │
                  │   React 19 + Bun (Vite) + Tailwind CSS 4    │
                  │   TanStack Query (Persisted Cache Layer)    │
                  └───────────────────────┬──────────────────────┘
                                          │
                                 JSON REST API / HTTPS
                                 (Bearer / Cookie Auth)
                                          │
                  ┌───────────────────────▼──────────────────────┐
                  │                 SERVER                      │
                  │   Go 1.24+ (Echo v4 Framework)              │
                  │   Clean Architecture (Layered Boundaries)   │
                  └───────────────┬──────────────────────┬───────┘
                                  │                      │
                       PostgreSQL (pgx/v5)        OpenAI-Compatible
                         Binary Protocol               Gateway
                                  │             (9router, OpenRouter)
                  ┌───────────────▼──────┐      ┌────────▼────────┐
                  │    PostgreSQL 16+    │      │ LLM Completions │
                  │  (Single Source of   │      │ (JSON Extraction│
                  │        Truth)        │      │    & Tooling)   │
                  └──────────────────────┘      └─────────────────┘
```

---

## 2. Directory Layout (Option B: Flat Root)

```text
finara/
├── client/                     # Frontend Application
│   ├── public/                 # Static assets (favicons, icons)
│   ├── src/
│   │   ├── api/                # HTTP client & endpoint contracts
│   │   ├── components/         # Reusable UI primitives (Button, Modal, Sheet, Input)
│   │   ├── features/           # Feature slices:
│   │   │   ├── auth/           # Login, Register, Session context
│   │   │   ├── home/           # Composer, Quick balance, Recent activity
│   │   │   ├── transactions/   # Add/Edit/Delete, List, Search
│   │   │   ├── budgets/        # Allocation sheet, Progress indicators
│   │   │   └── profile/        # Accounts, Privacy, Settings
│   │   ├── hooks/              # Query & mutation hooks with persistence
│   │   ├── lib/                # Money formatting, Date utilities, queryClient instance
│   │   ├── App.tsx             # Main routing & application shell
│   │   └── main.tsx            # Entrypoint with TanStack Query Persist Provider
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                     # Backend Application (Go)
│   ├── cmd/
│   │   └── api/
│   │       └── main.go         # Application bootstrap & dependency wiring
│   ├── internal/
│   │   ├── domain/             # Enterprise business entities & interfaces
│   │   │   ├── user.go
│   │   │   ├── account.go
│   │   │   ├── category.go
│   │   │   ├── transaction.go
│   │   │   ├── budget.go
│   │   │   ├── ai.go
│   │   │   └── errors.go       # Domain-level sentinel errors
│   │   ├── usecase/            # Application business rules
│   │   │   ├── auth_usecase.go
│   │   │   ├── account_usecase.go
│   │   │   ├── transaction_usecase.go
│   │   │   ├── budget_usecase.go
│   │   │   └── ai_usecase.go
│   │   ├── repository/         # Database persistence (PostgreSQL with pgx/v5)
│   │   │   ├── postgres/
│   │   │   │   ├── db.go
│   │   │   │   ├── user_repo.go
│   │   │   │   ├── transaction_repo.go
│   │   │   │   └── budget_repo.go
│   │   ├── delivery/
│   │   │   └── http/           # HTTP handlers, routers, and middlewares (Echo v4)
│   │   │       ├── router.go
│   │   │       ├── auth_handler.go
│   │   │       ├── transaction_handler.go
│   │   │       ├── budget_handler.go
│   │   │       ├── ai_handler.go
│   │   │       └── middleware/ # Auth validation, rate limit, CORS, recovery
│   │   └── ai/                 # Universal OpenAI-compatible client
│   │       ├── client.go       # Generic HTTP chat completions client
│   │       ├── parser.go       # System prompt & structured JSON parsing
│   │       └── tools.go        # Deterministic financial read queries
│   ├── migrations/             # SQL migration files (.up.sql, .down.sql)
│   ├── go.mod
│   └── go.sum
├── e2e/                        # End-to-End Tests (Playwright)
│   ├── tests/                  # Test specs (auth, composer, transactions, budgets)
│   ├── fixtures/               # Test helpers, fake users, database reset
│   └── playwright.config.ts    # Mobile-first viewport configurations
├── docs/                       # Specifications, Design, Architecture
├── AGENTS.md                   # Instructions for development agents
└── README.md                   # Project documentation & setup guide
```

---

## 3. Backend Architecture (Go Clean Architecture)

### Layered Separation of Concerns
1. **Domain Layer (`internal/domain`)**:
   - Berisi entity struct murni tanpa dependensi framework external.
   - Mengatur aturan dasar moneter: `Amount` disimpan dalam integer `int64` (Rupiah utuh).
   - Mendefinisikan interface repository (`UserRepository`, `TransactionRepository`, `BudgetRepository`).
2. **Usecase Layer (`internal/usecase`)**:
   - Mengorkestrasi alur data dan logika bisnis aplikasi.
   - Memastikan setiap aksi divalidasi terhadap kepemilikan user (`userID`).
   - Melakukan transaksi database atomik (misal: onboarding yang membuat akun awal dan kategori default sekaligus).
3. **Repository Layer (`internal/repository/postgres`)**:
   - Mengimplementasikan interface domain menggunakan driver `pgx/v5`.
   - Menggunakan raw SQL yang telah dioptimasi dengan query plan PostgreSQL atau `sqlc`.
   - Mencegah SQL Injection via parameter binding `$1, $2, ...`.
4. **Delivery Layer (`internal/delivery/http`)**:
   - Menggunakan **Echo v4** sebagai router dan HTTP engine.
   - Bertanggung jawab mem-parsing input request (JSON binding), validasi skema, dan memetakan domain error ke HTTP status code yang aman (400, 401, 403, 404, 422, 500).

---

## 4. Database Schema (PostgreSQL)

```sql
-- Users & Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);

-- Accounts
CREATE TYPE account_type AS ENUM ('CASH', 'BANK', 'E_WALLET');

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    type account_type NOT NULL,
    opening_balance BIGINT NOT NULL DEFAULT 0,
    opening_balance_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_account_user UNIQUE (id, user_id)
);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Categories
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    type transaction_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_category_user_type UNIQUE (id, user_id, type)
);
CREATE INDEX idx_categories_user_type ON categories(user_id, type);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL,
    category_id UUID NOT NULL,
    type transaction_type NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    description VARCHAR(255) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_time TIME,
    client_request_id UUID NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tx_account FOREIGN KEY (account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_category FOREIGN KEY (category_id, user_id, type) REFERENCES categories(id, user_id, type) ON DELETE RESTRICT,
    CONSTRAINT uq_tx_client_request UNIQUE (user_id, client_request_id)
);
CREATE INDEX idx_tx_user_date ON transactions(user_id, deleted_at, transaction_date DESC, created_at DESC);

-- Budgets
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL,
    category_type transaction_type NOT NULL DEFAULT 'EXPENSE',
    period_start DATE NOT NULL, -- Always 1st day of month
    amount BIGINT NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_budget_category FOREIGN KEY (category_id, user_id, category_type) REFERENCES categories(id, user_id, type) ON DELETE RESTRICT,
    CONSTRAINT uq_budget_user_cat_period UNIQUE (user_id, category_id, period_start)
);
CREATE INDEX idx_budgets_user_period ON budgets(user_id, period_start);

-- AI Rate Limiting
CREATE TABLE ai_rate_limits (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    window_started_at TIMESTAMPTZ NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. TanStack Query Persistence (Zero-Reload Architecture)

Untuk menjamin aplikasi tidak perlu reload dan terasa responsif seketika:

1. **Client Persister:**
   - Menggunakan `@tanstack/react-query-persist-client` bersama `createSyncStoragePersister` (menyimpan query cache di `localStorage` atau `idb-keyval` untuk IndexedDB).
2. **Persistence Strategy:**
   - **Data yang di-persist:**
     - `['finance', 'snapshot']` (saldo akun & ringkasan bulanan).
     - `['accounts']` & `['categories']` (daftar akun dan kategori pengguna).
     - `['transactions', 'recent']` (transaksi terbaru untuk Home).
     - `['budgets', currentMonth]` (budget bulan berjalan).
   - **Cache Lifetime:** `staleTime: 1000 * 60 * 5` (5 menit) dan `gcTime: 1000 * 60 * 60 * 24` (24 jam cache retention).
3. **Optimistic Updates:**
   - Penambahan transaksi baru langsung menyisipkan item ke cache lokal dan meng-update saldo agregat seketika (*instant response < 50ms*).
   - Jika koneksi gagal, sistem me-rollback query cache secara aman dan memunculkan status retry tanpa kehilangan draf input user.
4. **Targeted Invalidation:**
   - Mutasi sukses hanya me-refetch key yang terpengaruh (misal: tambah transaksi hanya me-refresh `['transactions']` dan `['finance', 'snapshot']`, tidak merefresh data budget jika tidak diperlukan).

---

## 6. Universal OpenAI-Compatible AI Gateway

Mekanisme parsing AI dirancang modular dan bebas vendor lock-in.

### Konfigurasi Lingkungan Server:
```env
AI_BASE_URL="https://api.9router.com/v1"   # atau https://openrouter.ai/api/v1
AI_API_KEY="sk-..."
AI_MODEL="google/gemini-2.5-flash"        # atau meta-llama/llama-3.3-70b-instruct
AI_TIMEOUT_SECONDS=8
AI_RATE_LIMIT_MAX=20
AI_RATE_LIMIT_WINDOW_SECONDS=60
```

### Flow Parsing Transaksi:
1. Client mengirim payload: `{ "prompt": "makan padang 25rb" }`.
2. Backend menyuntikkan konteks minimal:
   - Tanggal & waktu lokal Jakarta (WIB).
   - Daftar kategori user (nama dan id).
   - Daftar akun user (nama dan id).
3. Backend memanggil `{AI_BASE_URL}/chat/completions` dengan parameter:
   - `temperature: 0`
   - `max_tokens: 512`
   - `response_format: {"type": "json_object"}`
4. Response divalidasi ke struct Go:
   ```go
   type ParsedTransactionDraft struct {
       Amount          int64   `json:"amount"`
       Type            string  `json:"type"` // EXPENSE / INCOME
       CategoryID      string  `json:"category_id"`
       AccountID       string  `json:"account_id"`
       Description     string  `json:"description"`
       TransactionDate string  `json:"transaction_date"` // YYYY-MM-DD
   }
   ```
5. Hasil dikembalikan ke Client sebagai **Draft**. Transaksi **tidak pernah disimpan otomatis** ke database tanpa otorisasi final dari klik simpan user.

---

## 7. Testing Strategy

1. **Unit & Integration Tests (Go Backend):**
   - Unit test logika usecase dan domain parsing.
   - Database integration test dengan test container PostgreSQL (memastikan akurasi `BIGINT` dan isolasi multitenant `user_id`).
2. **Frontend Component Tests:**
   - Bun test runner untuk utility fungsi mata uang IDR, date-fns, dan hook TanStack Query.
3. **Playwright E2E Tests:**
   - Menjalankan skenario browser nyata dengan viewport mobile (Pixel 7 / iPhone 14):
     1. Registrasi & Onboarding saldo awal.
     2. Input transaksi melalui AI Composer -> sheet terbuka -> konfirmasi tersimpan.
     3. Input transaksi manual.
     4. Alokasi budget & verifikasi progress bar.
     5. Verifikasi zero-reload (buka halaman lain dan kembali, data tetap instan muncul dari persisted cache).

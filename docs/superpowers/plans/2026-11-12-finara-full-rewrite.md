# Finara 2.0 Full Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menulis ulang (full rewrite) Finara dari nol menjadi arsitektur decoupled monorepo berkinerja tinggi: Backend Go (Echo v4 + Clean Architecture + pgx/v5 PostgreSQL + Universal OpenAI completions gateway) dan Frontend React 19 (Bun + Vite + Tailwind CSS 4 + TanStack Query Persist Client) dengan standar visual anti-slop, zero onboarding, dan validasi input numerik ketat.

**Architecture:** Monorepo flat root (`server/`, `client/`, `e2e/`). Backend Go menerapkan Clean Architecture bertingkat (`domain`, `usecase`, `repository/postgres`, `delivery/http`, `ai`). Frontend mengusung mobile container 440px dengan persistensi cache TanStack Query untuk pengalaman instan tanpa reload (*zero-reload*).

**Tech Stack:** Go 1.24+, Echo v4, pgx/v5, golang-migrate, PostgreSQL 16+, Bun 1.4+, React 19, Vite, Tailwind CSS 4, TanStack Query v5 (@tanstack/react-query-persist-client), Lucide React, Playwright.

**Spec:** `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `AGENTS.md`.

## Global Constraints

- Backend moneter menggunakan `int64` Rupiah eksak tanpa floating-point math.
- Seluruh query dan mutasi data database di-scope wajib ke `user_id`.
- Zero Onboarding: pendaftaran langsung mengarahkan ke Home; backend otomatis membuat akun default "Tunai" (saldo 0) dan kategori standar dalam transaksi database atomik.
- Seluruh input nominal uang wajib `inputMode="numeric"`, `pattern="[0-9]*"`, memblokir karakter non-angka dan nilai negatif (< 0).
- Desain antarmuka wajib mengacu pada `docs/DESIGN.md`: kontainer 440px, font tabular untuk angka uang, elevated inputs 48px-52px, tanpa AI slop / tanpa emoji dekoratif, teks ringkas 1-3 kata.
- AI parsing menggunakan universal OpenAI Chat Completions gateway (9router / OpenRouter) dengan mode JSON terstruktur dan timeout 8 detik.

## Review Focus

1. **Zero Onboarding Atomic Persistence:** Pendaftaran user baru berhasil membuat user, sesi, akun default "Tunai", dan kategori standar sekaligus; jika ada kegagalan, rollback penuh dan tidak meninggalkan row yatim.
2. **Numeric Input & Negative Value Rejection:** Pengguna mengetik tanda minus, huruf, atau simbol di field nominal uang; antarmuka langsung memblokir karakter tersebut dan backend menolak payload `<= 0`.
3. **TanStack Query Zero-Reload Cache:** Saat berpindah tab (Home -> Activity -> Budget -> Home) atau me-refresh tab, data saldo dan riwayat langsung muncul instan dari cache lokal tanpa blank screen atau loading spinner berkedip.
4. **AI Parsing Error Recovery:** Gateway AI completions mengalami timeout atau mengembalikan output malformed; frontend tidak crash, draf teks user tetap utuh di composer, dan muncul pesan error ringkas "Coba lagi" atau opsi input manual.
5. **Multitenant Data Leakage Prevention:** User A mencoba mengakses atau memanipulasi transaksi / budget milik User B melalui manipulasi ID; backend wajib mengembalikan 404/403 tanpa membocorkan data.

---

### Task 1: Monorepo Foundation & Workspace Scaffolding

**Files:**
- Create: `server/go.mod`
- Create: `server/.env.example`
- Create: `client/package.json`
- Create: `client/vite.config.ts`
- Create: `client/tsconfig.json`
- Create: `client/index.html`
- Create: `client/.env.example`
- Create: `e2e/package.json`
- Create: `e2e/playwright.config.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: Setup scaffolding yang dapat di-build mandiri (`go test ./...` di `server/`, `bun run build` di `client/`, `bun run test` di `e2e/`).

- [x] **Step 1: Inisialisasi backend Go module dan dependency dasar**
  Inisialisasi Go module `finara/server` di folder `server/`, unduh Echo v4, pgx/v5, godotenv, validator.
- [x] **Step 2: Inisialisasi frontend React 19 + Bun + Vite di folder `client/`**
  Setup `client/` dengan React 19, TypeScript strict mode, Tailwind CSS 4, TanStack Query v5, lucide-react.
- [x] **Step 3: Setup Playwright di `e2e/`**
  Setup `e2e/` dengan `@playwright/test` dan konfigurasi emulasi mobile Edge/Pixel 7.
- [x] **Step 4: Update `.gitignore` root**
  Pastikan `node_modules/`, `.env`, build artifacts, dan binary Go di-ignore.
- [x] **Step 5: Verifikasi build baseline**
  Jalankan `cd client && bun run build` dan `cd ../server && go vet ./...`.
- [x] **Step 6: Commit**
  `git commit -m "chore: scaffold monorepo workspace for server, client, and e2e"`

---

### Task 2: PostgreSQL Migrations & Database Setup

**Files:**
- Create: `server/migrations/000001_init_schema.up.sql`
- Create: `server/migrations/000001_init_schema.down.sql`
- Create: `server/internal/repository/postgres/db.go`
- Test: `server/internal/repository/postgres/db_test.go`

**Interfaces:**
- Produces: `postgres.NewDBPool(ctx, databaseURL) (*pgxpool.Pool, error)`

- [x] **Step 1: Tulis file migration SQL up dan down**
  Terapkan skema lengkap sesuai `docs/ARCHITECTURE.md` (`users`, `auth_sessions`, `accounts`, `categories`, `transactions`, `budgets`, `ai_rate_limits`).
- [x] **Step 2: Tulis test koneksi database `db_test.go`**
  Test verifikasi koneksi pool pgx ke database PostgreSQL lokal (`SELECT 1`).
- [x] **Step 3: Implementasi pool connection helper di `db.go`**
  Inisialisasi `pgxpool.New(ctx, databaseURL)` dengan batas timeout dan health check.
- [x] **Step 4: Jalankan test database dan apply migrasi**
  Jalankan migrasi dan test: `cd server && go test -v ./internal/repository/postgres -run TestDBConnection`.
- [x] **Step 5: Commit**
  `git commit -m "feat(db): add initial postgresql migrations and pgx pool client"`

---

### Task 3: Backend Domain Models & Error Definitions

**Files:**
- Create: `server/internal/domain/user.go`
- Create: `server/internal/domain/account.go`
- Create: `server/internal/domain/category.go`
- Create: `server/internal/domain/transaction.go`
- Create: `server/internal/domain/budget.go`
- Create: `server/internal/domain/errors.go`
- Test: `server/internal/domain/transaction_test.go`

**Interfaces:**
- Produces: Domain structs murni, value object `int64` Money IDR, dan error constants (`ErrNotFound`, `ErrUnauthorized`, `ErrDuplicateRequest`, `ErrInvalidAmount`).

- [x] **Step 1: Tulis test validasi domain model `transaction_test.go`**
  Test verifikasi nominal harus positif (`Amount > 0`), tanggal transaksi tidak boleh kosong, dan format kategori cocok.
- [x] **Step 2: Definisikan seluruh domain entities dan interfaces di `internal/domain`**
  Tulis struct `User`, `Account`, `Category`, `Transaction`, `Budget`, beserta interface repository yang dibutuhkan.
- [x] **Step 3: Jalankan test domain**
  Jalankan `cd server && go test -v ./internal/domain/...`.
- [x] **Step 4: Commit**
  `git commit -m "feat(domain): define core business entities and error sentinels"`

---

### Task 4: Backend Auth & Zero-Onboarding Atomic Setup

**Files:**
- Create: `server/internal/repository/postgres/user_repo.go`
- Create: `server/internal/usecase/auth_usecase.go`
- Create: `server/internal/delivery/http/auth_handler.go`
- Create: `server/internal/delivery/http/middleware/auth_middleware.go`
- Test: `server/internal/usecase/auth_usecase_test.go`
- Test: `server/internal/delivery/http/auth_handler_test.go`

**Interfaces:**
- Produces: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.
- Behavior: Registrasi langsung membuat User, Sesi token, akun default "Tunai" (type `CASH`, saldo 0), dan kategori standar secara atomik dalam satu DB transaction.

- [x] **Step 1: Tulis failing test untuk atomic registration di `auth_usecase_test.go`**
  Pastikan saat `Register` dipanggil, akun "Tunai" dan kategori default langsung terbuat untuk user baru.
- [x] **Step 2: Implementasi `UserRepo` dan DB transaction di `user_repo.go`**
  Gunakan bcrypt/argon2 untuk hash password dan pgx `BeginTx` untuk atomisitas.
- [x] **Step 3: Implementasi `AuthUsecase` dan JWT/Session token generation**
- [x] **Step 4: Implementasi Echo `AuthHandler` dan `AuthMiddleware`**
  Pastikan `AuthMiddleware` mengekstrak `user_id` dari Bearer token dan menyimpannya di context Echo.
- [x] **Step 5: Jalankan test dan verifikasi pass**
  `cd server && go test -v ./internal/usecase/... ./internal/delivery/http/...`.
- [x] **Step 6: Commit**
  `git commit -m "feat(auth): implement atomic registration with zero onboarding and session auth"`

---

### Task 5: Backend Financial Core (Accounts, Categories, Transactions & Budgets)

**Files:**
- Create: `server/internal/repository/postgres/transaction_repo.go`
- Create: `server/internal/repository/postgres/budget_repo.go`
- Create: `server/internal/usecase/transaction_usecase.go`
- Create: `server/internal/usecase/budget_usecase.go`
- Create: `server/internal/delivery/http/transaction_handler.go`
- Create: `server/internal/delivery/http/budget_handler.go`
- Test: `server/internal/usecase/transaction_usecase_test.go`
- Test: `server/internal/usecase/budget_usecase_test.go`

**Interfaces:**
- Produces:
  - `GET /api/finance/snapshot` (total balance, monthly expense, monthly income)
  - `GET /api/transactions` (cursor pagination, search)
  - `POST /api/transactions` (create with `client_request_id` idempotency)
  - `PATCH /api/transactions/:id` (edit)
  - `DELETE /api/transactions/:id` (soft-delete)
  - `GET /api/budgets?month=YYYY-MM` (list with progress)
  - `POST /api/budgets` (allocate/update category budget)

- [x] **Step 1: Tulis failing tests untuk kalkulasi saldo snapshot, transaksi, dan budget**
- [x] **Step 2: Implementasi `TransactionRepo` dan `BudgetRepo` PostgreSQL**
- [x] **Step 3: Implementasi `TransactionUsecase` dan `BudgetUsecase`**
  Pastikan validasi multitenan (`userID`) dan isolasi data 100% ketat.
- [x] **Step 4: Implementasi Echo handlers dan route registration**
- [x] **Step 5: Jalankan test integrasi backend**
  `cd server && go test -v ./...`.
- [x] **Step 6: Commit**
  `git commit -m "feat(finance): implement transactions, budgets, and financial snapshot APIs"`

---

### Task 6: Backend Universal OpenAI-Compatible AI Gateway

**Files:**
- Create: `server/internal/ai/client.go`
- Create: `server/internal/ai/parser.go`
- Create: `server/internal/usecase/ai_usecase.go`
- Create: `server/internal/delivery/http/ai_handler.go`
- Test: `server/internal/ai/client_test.go`
- Test: `server/internal/usecase/ai_usecase_test.go`

**Interfaces:**
- Produces: `POST /api/ai/parse-transaction` (input natural language, output `ParsedTransactionDraft`).
- Behavior: Berjalan dengan 9router / OpenRouter / Groq / OpenAI via `AI_BASE_URL` dan `AI_API_KEY`. Timeout 8 detik. Selalu mengembalikan Draft, tidak auto-save.

- [ ] **Step 1: Tulis unit test untuk client HTTP AI dan parser response JSON**
  Test verifikasi parsing JSON output, timeout context handling, dan error mapping.
- [ ] **Step 2: Implementasi generic OpenAI-compatible completions client di `internal/ai/client.go`**
  Menggunakan standar `POST {AI_BASE_URL}/chat/completions` dengan `response_format: {"type": "json_object"}`.
- [ ] **Step 3: Implementasi prompt injeksi konteks minimal (kategori user, akun, tanggal Jakarta)**
- [ ] **Step 4: Implementasi `AiUsecase` dengan rate limiting berbasis database per user**
- [ ] **Step 5: Implementasi `AiHandler` di Echo**
- [ ] **Step 6: Jalankan test AI backend**
  `cd server && go test -v ./internal/ai/... ./internal/usecase/...`.
- [ ] **Step 7: Commit**
  `git commit -m "feat(ai): add universal openai-compatible transaction parsing gateway"`

---

### Task 7: Frontend Application Shell, Theme & Mobile Layout

**Files:**
- Create: `client/src/styles/theme.css`
- Create: `client/src/components/layout/AppShell.tsx`
- Create: `client/src/components/layout/BottomNav.tsx`
- Create: `client/src/components/layout/Header.tsx`
- Test: `client/src/components/layout/AppShell.test.tsx`

**Interfaces:**
- Produces: Layout wrapper dengan max-width 440px di tengah layar, safe area support, dan BottomNav 4 tab (Home, Aktivitas, Budget, Profil).

- [ ] **Step 1: Setup CSS tokens untuk Dark Obsidian dan Light Daylight di Tailwind 4**
  Terapkan warna `#090A0F`, `#12141D`, `#1A1D2B`, `#10B981` sesuai `docs/DESIGN.md`.
- [ ] **Step 2: Implementasi `AppShell.tsx` dengan kontainer centered 440px**
- [ ] **Step 3: Implementasi `BottomNav.tsx` dengan icon tab minimalis dan tap target 44px**
- [ ] **Step 4: Jalankan test layout component**
  `cd client && bun test`.
- [ ] **Step 5: Commit**
  `git commit -m "feat(ui): implement mobile-first 440px app shell and theme tokens"`

---

### Task 8: Frontend TanStack Query Persistent Client & Auth Store

**Files:**
- Create: `client/src/lib/queryClient.ts`
- Create: `client/src/api/client.ts`
- Create: `client/src/features/auth/useAuth.ts`
- Create: `client/src/features/auth/AuthPages.tsx`
- Test: `client/src/lib/queryClient.test.ts`
- Test: `client/src/features/auth/useAuth.test.ts`

**Interfaces:**
- Produces: `PersistQueryClientProvider` dengan localStorage/IndexedDB sync persister, zero-reload state, dan auth session token management.

- [ ] **Step 1: Tulis test konfigurasi persist query client dan fallback cache**
- [ ] **Step 2: Implementasi `queryClient.ts` dengan `@tanstack/react-query-persist-client`**
  Konfigurasi `gcTime` 24 jam dan `staleTime` 5 menit untuk data keuangan utama.
- [ ] **Step 3: Implementasi API fetcher wrapper dengan token injection di `api/client.ts`**
- [ ] **Step 4: Implementasi hook `useAuth` dan halaman Register/Login (Zero Onboarding)**
  Setelah registrasi berhasil, langsung simpan token dan redirect ke Home.
- [ ] **Step 5: Jalankan test auth & query client**
  `cd client && bun test`.
- [ ] **Step 6: Commit**
  `git commit -m "feat(query): configure persisted query client and zero-onboarding auth flow"`

---

### Task 9: Frontend Custom Input Fields & Keypad Numerik

**Files:**
- Create: `client/src/components/ui/NumericInput.tsx`
- Create: `client/src/components/ui/Button.tsx`
- Create: `client/src/components/ui/BottomSheet.tsx`
- Test: `client/src/components/ui/NumericInput.test.tsx`

**Interfaces:**
- Produces:
  - `<NumericInput value={amount} onChange={(rawInt) => ...} />`
  - `<BottomSheet open={isOpen} onClose={...} />`

- [ ] **Step 1: Tulis failing test untuk `NumericInput`**
  Verifikasi: hanya menerima digit angka positif, memblokir tanda minus `-` dan huruf, memformat tampilan visual menjadi `Rp50.000`, mengembalikan integer murni `50000`.
- [ ] **Step 2: Implementasi `NumericInput.tsx`**
  Atribut `inputMode="numeric"`, `pattern="[0-9]*"`, tinggi 48-52px, elevated surface, emerald focus ring, quick clear "X" button.
- [ ] **Step 3: Implementasi `BottomSheet.tsx` dengan physics drag down / spring animation**
- [ ] **Step 4: Jalankan test komponen input**
  `cd client && bun test`.
- [ ] **Step 5: Commit**
  `git commit -m "feat(ui): add custom numeric currency input and tactile bottom sheet"`

---

### Task 10: Frontend Home Dashboard & AI Composer

**Files:**
- Create: `client/src/features/home/HomeDashboard.tsx`
- Create: `client/src/features/home/AIComposer.tsx`
- Create: `client/src/features/home/TransactionConfirmationSheet.tsx`
- Test: `client/src/features/home/HomeDashboard.test.tsx`
- Test: `client/src/features/home/AIComposer.test.tsx`

**Interfaces:**
- Produces: Halaman Home dengan total saldo tabular, ringkasan pengeluaran/pemasukan bulan berjalan, recent transactions, tombol transaksi manual, dan persistent AI Composer yang membuka `TransactionConfirmationSheet`.

- [ ] **Step 1: Tulis failing test untuk parsing flow AI Composer dan confirmation sheet**
- [ ] **Step 2: Implementasi `AIComposer.tsx` (input teks seperti chat, loading indicator tipis emerald)**
- [ ] **Step 3: Implementasi `TransactionConfirmationSheet.tsx` (tinjau tipe, nominal besar, pill kategori, tombol simpan 1 tap)**
- [ ] **Step 4: Sambungkan optimistic update ke TanStack Query saat transaksi disimpan**
- [ ] **Step 5: Jalankan test Home & Composer**
  `cd client && bun test`.
- [ ] **Step 6: Commit**
  `git commit -m "feat(home): build home dashboard, ai composer, and confirmation sheet with optimistic updates"`

---

### Task 11: Frontend Activity & Search Flow

**Files:**
- Create: `client/src/features/activity/ActivityPage.tsx`
- Create: `client/src/features/activity/TransactionDetailSheet.tsx`
- Test: `client/src/features/activity/ActivityPage.test.tsx`

**Interfaces:**
- Produces: Halaman Aktivitas dengan infinite scroll / pagination, filter pencarian teks & nominal IDR, sheet edit transaksi, dan konfirmasi hapus transaksi.

- [ ] **Step 1: Tulis test query dan render daftar transaksi**
- [ ] **Step 2: Implementasi filter search real-time dengan debouncing**
- [ ] **Step 3: Implementasi edit transaksi dan soft-delete dengan invalidasi cache terarah**
- [ ] **Step 4: Jalankan test activity**
  `cd client && bun test`.
- [ ] **Step 5: Commit**
  `git commit -m "feat(activity): build transaction history, search, and edit/delete sheet"`

---

### Task 12: Frontend Budget Management Flow

**Files:**
- Create: `client/src/features/budgets/BudgetPage.tsx`
- Create: `client/src/features/budgets/BudgetAllocationSheet.tsx`
- Test: `client/src/features/budgets/BudgetPage.test.tsx`

**Interfaces:**
- Produces: Halaman Budget dengan linear progress gauge per kategori, peringatan over-budget, dan sheet alokasi limit budget bulanan dengan input numerik murni.

- [ ] **Step 1: Tulis test kalkulasi progres persentase budget dan warna gauge**
- [ ] **Step 2: Implementasi `BudgetPage.tsx` dan `BudgetAllocationSheet.tsx`**
- [ ] **Step 3: Jalankan test budget**
  `cd client && bun test`.
- [ ] **Step 4: Commit**
  `git commit -m "feat(budget): build monthly category budget dashboard and allocation sheet"`

---

### Task 13: Playwright Mobile E2E Suite & CI Quality Gates

**Files:**
- Create: `e2e/tests/critical-flow.spec.ts`
- Create: `e2e/tests/zero-reload.spec.ts`
- Create: `scripts/test-all.sh`

**Interfaces:**
- Produces: Rangkaian automated testing E2E lengkap yang memverifikasi flow nyata dari browser mobile:
  1. Registrasi (Zero Onboarding langsung ke Home).
  2. Input AI transaksi ("makan padang 25rb") -> sheet konfirmasi -> simpan.
  3. Input transaksi manual dengan verifikasi keypad numerik dan pemblokiran nilai negatif.
  4. Alokasi budget bulanan.
  5. Verifikasi zero-reload (pindah tab tanpa jeda/reload browser).

- [ ] **Step 1: Implementasi skrip pembantu reset test database di Go**
- [ ] **Step 2: Tulis test Playwright untuk alur kritis registrasi -> AI expense -> manual expense**
- [ ] **Step 3: Tulis test Playwright untuk verifikasi zero-reload dan cache persistence**
- [ ] **Step 4: Jalankan seluruh suite E2E**
  `cd e2e && bun run test`.
- [ ] **Step 5: Commit**
  `git commit -m "test(e2e): cover all critical user flows with mobile playwright journeys"`

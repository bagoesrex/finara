# Finara

Finara adalah aplikasi pelacak dan asisten keuangan pribadi (*personal finance companion*) berbasis AI dengan pendekatan **mobile-first**, cepat, dan bebas distraksi untuk pengguna Indonesia.

Mencatat transaksi terasa secepat mengirim pesan instan: cukup ketik `makan siang 25rb`, tinjau draf pada *bottom sheet* taktil, dan simpan dalam 1 tap.

---

## 🚀 Keunggulan Arsitektur Baru (Finara 2.0)

- **Decoupled Monorepo:** Frontend murni (*Client*) dan Backend performa tinggi (*Go Clean Architecture*).
- **Zero-Reload Persistence:** Didukung oleh **TanStack Query Persist Client** (`@tanstack/react-query-persist-client`) untuk transisi antar halaman instan, caching persisten di storage lokal, dan rendering tanpa blank screen saat membuka aplikasi.
- **Universal AI Completions Gateway:** Satu integrasi modular berbasis protokol OpenAI Chat Completions yang kompatibel langsung dengan **9router**, **OpenRouter**, **Groq**, **Ollama**, maupun hosted LLM lainnya tanpa vendor lock-in.
- **Desain Anti-Slop (*Tactile Financial Precision*):** Antarmuka ramah jempol (lebar kontainer max 440px), tipografi angka tabular (`tabular-nums`), motion halus (*spring physics drawer*), dan tanpa klise AI generik.
- **Integritas Moneter Penuh:** Seluruh nominal uang disimpan dalam representasi integer eksak (`int64` Rupiah di Go dan `BIGINT` di PostgreSQL) tanpa floating-point math.

---

## 📁 Struktur Monorepo

```text
finara/
├── client/                     # Frontend: React 19 + Bun (Vite) + Tailwind CSS 4
│   ├── src/
│   │   ├── api/                # API client & endpoint contracts
│   │   ├── components/         # Reusable primitives (Buttons, Bottom Sheets, Modals)
│   │   ├── features/           # Feature slices (Home, Transactions, Budgets, Profile)
│   │   ├── hooks/              # Persisted TanStack Query & Mutation hooks
│   │   └── lib/                # Money formatting, Date utilities, QueryClient
├── server/                     # Backend: Go 1.24+ (Echo v4, PostgreSQL pgx/v5)
│   ├── cmd/api/main.go         # Application bootstrap & dependency injection
│   ├── internal/
│   │   ├── domain/             # Enterprise business models & repository interfaces
│   │   ├── usecase/            # Application business logic & multitenancy rules
│   │   ├── repository/postgres/# PostgreSQL database operations (pgx/v5)
│   │   ├── delivery/http/      # Echo route handlers & middlewares (Auth, RateLimit)
│   │   └── ai/                 # Universal OpenAI chat completions client & parser
│   └── migrations/             # SQL migrations (golang-migrate)
├── e2e/                        # End-to-End Tests: Playwright (Mobile Viewport)
├── docs/                       # Dokumentasi Lengkap
│   ├── PRD.md                  # Product Requirements Document
│   ├── ARCHITECTURE.md         # Technical Architecture & Database Schema
│   └── DESIGN.md               # Design System, Tokens, & Anti-Slop Guidelines
├── AGENTS.md                   # Panduan & aturan khusus development agents
└── README.md                   # Dokumentasi repositori utama
```

---

## 🛠️ Persyaratan Sistem

- **Bun** (v1.4+)
- **Go** (v1.24+)
- **PostgreSQL** (v16+)

---

## ⚡ Panduan Menjalankan Proyek

### 1. Database PostgreSQL
Pastikan database PostgreSQL aktif dan buat database baru:
```sql
CREATE DATABASE finara_db;
```

### 2. Backend (Go Server)
Masuk ke direktori `server/` dan konfigurasikan `.env`:
```bash
cd server
cp .env.example .env
```

Contoh konfigurasi environment backend:
```env
PORT=8080
DATABASE_URL=postgres://postgres:password@localhost:5432/finara_db?sslmode=disable
JWT_SECRET=super-secret-jwt-key

# Universal AI Gateway (9router / OpenRouter / Groq)
AI_BASE_URL=https://api.9router.com/v1
AI_API_KEY=your-api-key
AI_MODEL=google/gemini-2.5-flash
```

Jalankan server:
```bash
go run cmd/api/main.go
```

### 3. Frontend (React + Bun)
Masuk ke direktori `client/`:
```bash
cd client
bun install
bun run dev
```
Akses aplikasi melalui browser di `http://localhost:5173`.

---

## 🧪 Pengujian & Kualitas

### Unit & Integration Test (Backend Go):
```bash
cd server
go test -v ./...
```

### Component & Unit Test (Frontend Bun):
```bash
cd client
bun test
```

### End-to-End Mobile Testing (Playwright):
```bash
cd e2e
bun install
bun run test
```

---

## 📖 Dokumentasi Terkait

- [Product Requirements Document (PRD)](./docs/PRD.md)
- [Technical Architecture & Database Schema](./docs/ARCHITECTURE.md)
- [Design System & Anti-Slop Guidelines](./docs/DESIGN.md)

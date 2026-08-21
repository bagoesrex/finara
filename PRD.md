# Product Requirements Document

## Finara

**AI-Powered Personal Finance Assistant**

Finara adalah aplikasi pencatatan dan pemantauan keuangan pribadi berbasis AI yang dirancang dengan pendekatan **mobile-first**, sederhana, cepat, dan minim distraksi.

Fokus utama Finara adalah membuat aktivitas pencatatan keuangan terasa semudah mengirim pesan.

Pengguna tidak perlu melewati banyak form, memilih terlalu banyak opsi, atau memahami istilah finansial yang kompleks.

Contoh interaksi utama:

> Makan siang 25rb

Finara memahami input tersebut dan mengubahnya menjadi transaksi:

**Rp25.000 · Makanan**

---

# 1. Product Vision

Finara bertujuan menjadi aplikasi keuangan pribadi yang terasa seperti **financial companion**, bukan aplikasi akuntansi.

Prinsip utama produk:

1. **Simple before powerful**
2. **Mobile-first**
3. **AI as an interaction layer**
4. **Minimal interface**
5. **Information over decoration**
6. **Fast interaction**
7. **No AI slop**
8. **Every element must have a purpose**

Pengguna harus dapat memahami aplikasi dalam beberapa detik tanpa onboarding panjang.

---

# 2. Target User

Target utama:

* Mahasiswa
* Fresh graduate
* Pekerja muda
* Freelancer
* Pengguna berusia sekitar 18–35 tahun
* Pengguna yang ingin mencatat keuangan tetapi malas menggunakan aplikasi finance yang kompleks

Karakteristik pengguna:

* Terbiasa menggunakan aplikasi mobile
* Menginginkan proses pencatatan cepat
* Tidak ingin mengisi banyak field
* Tidak membutuhkan sistem accounting profesional
* Menginginkan insight sederhana tentang kondisi keuangan

---

# 3. Core Problem

Sebagian aplikasi keuangan memiliki terlalu banyak langkah untuk mencatat transaksi.

Contohnya:

```text
Tambah transaksi
↓
Pilih tipe
↓
Pilih rekening
↓
Masukkan nominal
↓
Pilih kategori
↓
Masukkan tanggal
↓
Tambahkan catatan
↓
Simpan
```

Finara mengubah proses tersebut menjadi:

```text
"Makan 25rb"

↓ AI

Rp25.000
Makanan
Hari ini

↓ Confirm
```

Targetnya adalah membuat pencatatan transaksi selesai dalam **1–2 interaksi utama**.

---

# 4. Product Positioning

Finara bukan:

* aplikasi accounting
* aplikasi bookkeeping bisnis
* aplikasi investasi
* aplikasi perbankan
* chatbot AI generik

Finara adalah:

> **AI-powered personal finance assistant designed around effortless money tracking.**

---

# 5. Design Direction

## 5.1 Mobile-First Layout

Seluruh aplikasi menggunakan layout mobile sebagai layout utama.

Desktop tidak mengubah aplikasi menjadi dashboard lebar.

Pada layar desktop, aplikasi tetap berada di tengah layar.

Contoh:

```text
Desktop

┌─────────────────────────────────────────────┐
│                                             │
│              ┌───────────────┐              │
│              │               │              │
│              │    Finara     │              │
│              │               │              │
│              │               │              │
│              │               │              │
│              └───────────────┘              │
│                                             │
└─────────────────────────────────────────────┘
```

Rekomendasi global container:

```css
width: 100%;
max-width: 480px;
margin-inline: auto;
min-height: 100dvh;
```

Rentang ideal:

**420–480px maximum width**

Desktop hanya memberikan ruang kosong di sisi kiri dan kanan.

---

# 6. Global Navigation

Navigasi utama selalu berada di bagian bawah.

Bottom navigation bersifat **persistent** pada hampir seluruh halaman utama.

Struktur utama:

```text
Home        Activity        AI        Budget        Profile
```

Namun untuk menjaga interface minimal, disarankan menggunakan maksimal **4 menu utama**.

Rekomendasi:

```text
Home        Activity        Finara        Profile
```

atau:

```text
Home        Activity        Budget        Profile
```

AI tidak harus mendapatkan halaman terpisah apabila AI dijadikan interaction layer utama di halaman Home.

Pilihan yang direkomendasikan:

```text
Home
Activity
Budget
Profile
```

AI entry point berada sebagai floating composer / input utama.

---

# 7. Navigation Design

Bottom navigation harus sederhana.

Contoh:

```text
┌─────────────────────────────────┐
│                                 │
│          Page Content           │
│                                 │
│                                 │
├─────────────────────────────────┤
│   ⌂        ◷        ◉        ○  │
│ Home   Activity   Budget   Me   │
└─────────────────────────────────┘
```

Ketentuan:

* maksimal 4 menu
* icon sederhana
* label pendek
* tidak menggunakan icon dekoratif
* active state tidak berlebihan
* hindari floating navigation berukuran besar
* hindari efek glassmorphism berlebihan

Navigation harus terasa sebagai bagian alami dari aplikasi.

---

# 8. Visual Design Principles

## 8.1 Anti AI Slop

Finara harus menghindari pola desain yang terlalu identik dengan UI hasil generator AI.

Hindari:

* gradient ungu-biru generik
* glowing border di semua elemen
* terlalu banyak card
* card di dalam card
* icon Sparkles di mana-mana
* tagline AI yang berlebihan
* glassmorphism berlebihan
* floating orb
* decorative blob
* random gradient background
* terlalu banyak pill
* excessive border radius
* dashboard penuh statistik
* generic AI assistant avatar
* robot mascot tanpa alasan
* setiap section memiliki heading + subtitle panjang
* animasi hanya untuk terlihat futuristik

AI harus terlihat dari **kemampuan aplikasi**, bukan ornamen visual.

---

# 9. Visual Character

Finara sebaiknya memiliki karakter:

**Calm**

**Clean**

**Financial**

**Personal**

**Modern**

**Precise**

**Slightly playful**

Bukan:

**Corporate banking**

dan bukan:

**Futuristic AI dashboard**

---

# 10. Typography

Typography menjadi elemen visual utama.

Gunakan hierarchy yang jelas.

Contoh:

```text
Rp4.250.000
Available balance

August
You spent Rp1.420.000

Recent
```

Kurangi penggunaan:

* bold berlebihan
* uppercase
* heading panjang

Gunakan maksimal sekitar:

```text
Display
Heading
Body
Caption
```

---

# 11. Color System

Gunakan sistem warna sederhana.

Base:

* background neutral
* foreground gelap
* muted foreground
* subtle border
* satu primary accent

Status color hanya digunakan ketika memiliki arti:

* income
* expense
* warning
* success

Hindari membuat setiap kategori mempunyai warna mencolok.

Kategori lebih baik dikenali melalui:

**icon + text**

daripada:

**warna + gradient + badge**

---

# 12. Border Radius

Gunakan radius secara terkendali.

Contoh:

```text
Button     12–14px
Input      14–16px
Card       16–20px
Sheet      24px
```

Jangan membuat seluruh komponen berbentuk pill.

Pill hanya digunakan untuk komponen yang memang sesuai seperti:

* filter
* small status
* category selector

---

# 13. Home

Home merupakan halaman paling penting.

Tujuan Home:

> Dalam waktu kurang dari 5 detik, pengguna harus memahami kondisi keuangannya.

Struktur:

```text
Finara                      Avatar

Available

Rp4.250.000

Spent this month
Rp1.420.000

────────────

[ Ask Finara or add transaction... ]

────────────

Recent

Coffee                     -18.000
Lunch                      -25.000
Salary                 +5.000.000

See all
```

Jangan memasukkan terlalu banyak analytics di Home.

---

# 14. Balance

Balance menjadi informasi utama.

Contoh:

```text
Available

Rp4.250.000
```

Tidak diperlukan card besar jika tidak memiliki fungsi tambahan.

Balance dapat langsung menjadi bagian layout.

Tambahan kecil:

```text
+8% from last month
```

hanya jika benar-benar memberikan informasi relevan.

---

# 15. AI Composer

AI Composer merupakan fitur utama Finara.

Contoh:

```text
┌────────────────────────────────┐
│ Catat sesuatu...           ↑   │
└────────────────────────────────┘
```

Placeholder dapat berganti secara kontekstual:

```text
Catat pengeluaran...
```

atau:

```text
Makan 25rb...
```

Jangan menggunakan:

> Ask Finara anything about your finances and let AI help you manage your financial life...

Terlalu panjang.

---

# 16. AI Interaction

Contoh input:

```text
ngopi 20rb
```

Response:

```text
Coffee

Rp20.000
Food & Drink

Today, 20:14

[Save]
```

AI tidak perlu menjawab:

> Tentu! Saya telah berhasil memahami transaksi Anda...

Hindari conversational filler.

Response Finara harus ringkas.

---

# 17. Smart Transaction Parsing

Finara harus dapat memahami:

```text
makan 25rb
```

```text
gaji masuk 5jt
```

```text
kemarin beli bensin 50 ribu
```

```text
bayar wifi 350k
```

```text
grab 22rb tadi pagi
```

Informasi yang diekstrak:

* transaction type
* amount
* description
* category
* date
* time jika relevan

---

# 18. Confirmation Flow

Untuk mengurangi kesalahan AI, transaksi yang dipahami AI dapat ditampilkan sebagai preview.

Contoh:

```text
Lunch

Rp25.000

Food & Drink
Today

Cancel                 Save
```

Untuk input dengan confidence tinggi, nantinya dapat diberikan opsi:

**Auto-save AI transactions**

Namun bukan fitur MVP.

---

# 19. Activity

Activity digunakan untuk melihat seluruh transaksi.

Layout:

```text
Activity

August 2026

21 Aug
Coffee                          -18.000
Lunch                           -25.000

20 Aug
Grab                            -22.000
Internet                       -350.000

19 Aug
Salary                       +5.000.000
```

Tidak semua transaksi membutuhkan card.

Gunakan list sederhana.

---

# 20. Activity Search

Search harus ringan.

```text
Search transactions
```

Kemampuan pencarian:

* merchant
* description
* category
* amount

Contoh:

```text
"kopi"
```

menghasilkan semua transaksi terkait kopi.

---

# 21. Transaction Detail

Transaction detail dibuat sederhana.

```text
Coffee

Rp18.000

Food & Drink
21 Aug 2026 · 18:42

Account
Cash

Note
—

Delete                  Edit
```

Hindari menampilkan informasi yang tidak berguna.

---

# 22. Add Transaction Manual

Walaupun AI menjadi fitur utama, input manual tetap diperlukan.

Form minimal:

```text
Amount

Rp __________


Expense      Income


Category
Food & Drink


Note
Optional


Add transaction
```

Date secara default:

**Today**

Field tanggal hanya muncul ketika pengguna ingin menggantinya.

---

# 23. Budget

Budget tidak perlu dibuat seperti spreadsheet.

Contoh:

```text
August Budget

Rp3.000.000
Rp1.420.000 spent

████████░░░░░

Food
420k / 800k

Transport
180k / 400k

Entertainment
240k / 300k
```

Prioritaskan visual progress sederhana.

---

# 24. AI Financial Insight

Finara dapat memberikan insight berdasarkan data transaksi.

Contoh:

```text
Spending

Food spending is 18% higher
than last month.
```

atau:

```text
You have Rp580k left
for your Food budget.
```

Insight harus:

* singkat
* berbasis data
* actionable
* tidak judgemental

Hindari:

> Based on a comprehensive analysis of your financial behavior...

---

# 25. Ask Finara

Pengguna dapat menanyakan data keuangan menggunakan bahasa natural.

Contoh:

```text
berapa pengeluaranku minggu ini?
```

Jawaban:

```text
Rp425.000

12–18 August

Food              185k
Transport          120k
Other              120k
```

Kemudian maksimal beberapa suggestion:

```text
Compare last week
```

Tidak perlu menghasilkan paragraf panjang.

---

# 26. Example AI Queries

Finara harus memahami pertanyaan seperti:

```text
bulan ini paling banyak habis buat apa?
```

```text
berapa budget makan yang tersisa?
```

```text
bandingkan pengeluaran bulan ini dengan bulan lalu
```

```text
berapa total grab bulan ini?
```

```text
berapa uang yang masuk minggu ini?
```

---

# 27. AI Architecture

Arsitektur awal:

```text
Finara Client
      │
      ▼
Application Backend
      │
 ┌────┴───────────┐
 │                │
 ▼                ▼
LLM            PostgreSQL
 │
 ▼
Tool Calling
 │
 ├── create_transaction
 ├── get_transactions
 ├── get_balance
 ├── get_budget
 └── get_spending_summary
```

Database tetap menjadi **source of truth**.

AI tidak menyimpan saldo atau transaksi berdasarkan conversation memory.

---

# 28. AI Prompt Structure

Prompt dapat dipisahkan secara modular.

```text
ai/
├── system.md
├── transaction-parser.md
├── categories.md
├── financial-insight.md
└── response-style.md
```

Markdown digunakan untuk static instruction.

Financial data tetap berasal dari database.

---

# 29. MCP

MCP tidak menjadi dependency wajib untuk MVP.

Tahap pertama dapat menggunakan normal function/tool calling.

MCP dapat ditambahkan sebagai pengembangan lanjutan.

Contoh:

```text
Finara AI
    │
    ▼
MCP Server
    │
    ├── transaction tools
    ├── budgeting tools
    ├── analytics tools
    └── finance resources
```

Dengan demikian architecture tetap sederhana terlebih dahulu tetapi memiliki ruang untuk berkembang.

---

# 30. Database Core Entities

Minimal entity:

```text
User

Account

Transaction

Category

Budget
```

Opsional tahap berikutnya:

```text
FinancialGoal

RecurringTransaction

AIConversation

AIInsight
```

---

# 31. Transaction Entity

Minimal fields:

```text
id
userId
accountId
categoryId

type
amount
description

transactionDate

createdAt
updatedAt
```

Jenis transaksi:

```text
INCOME
EXPENSE
```

---

# 32. Category

Default category sebaiknya tidak terlalu banyak.

Expense:

```text
Food & Drink
Transport
Shopping
Bills
Entertainment
Health
Education
Other
```

Income:

```text
Salary
Freelance
Business
Gift
Other
```

Pengguna dapat membuat kategori tambahan kemudian.

---

# 33. Accounts

MVP dapat menyediakan:

```text
Cash
Bank
E-Wallet
```

Pengguna dapat memberikan nama sendiri:

```text
BCA
GoPay
Cash
```

Jangan membuat pengaturan account terlalu kompleks.

---

# 34. Empty State

Empty state harus sederhana.

Contoh Home:

```text
No transactions yet.

Try:
"Makan siang 30rb"
```

Tidak diperlukan ilustrasi besar.

Empty state sekaligus mengajarkan pengguna bagaimana menggunakan AI.

---

# 35. Loading State

Gunakan:

* skeleton sederhana
* subtle spinner jika perlu

Hindari:

```text
Finara AI is thinking...
✨
```

kecuali benar-benar diperlukan.

Untuk AI processing:

```text
Understanding...
```

cukup.

---

# 36. Microinteraction

Animasi hanya digunakan untuk menjelaskan perubahan state.

Contoh:

* transaction inserted
* bottom sheet opened
* navigation transition
* budget progress changed

Gunakan motion pendek.

Tidak ada animation yang hanya dekoratif.

---

# 37. Bottom Sheet

Gunakan bottom sheet untuk quick actions seperti:

```text
Add transaction
Filter
Choose category
Select account
```

Hal ini menjaga pengguna tetap berada dalam context halaman.

---

# 38. Interaction Philosophy

Setiap flow harus mempertimbangkan:

> Apakah langkah ini benar-benar diperlukan?

Jika tidak, hilangkan.

Contoh:

Daripada:

```text
Add Transaction
→ Expense
→ Amount
→ Category
→ Date
→ Description
→ Save
```

Finara:

```text
"makan 25rb"

→ Save
```

---

# 39. Content Design

Gunakan bahasa pendek.

Hindari:

```text
Your Financial Overview
```

Gunakan:

```text
Overview
```

Hindari:

```text
Total Expenses This Month
```

Gunakan:

```text
Spent
```

Hindari:

```text
Artificial Intelligence Assistant
```

Gunakan:

```text
Finara
```

---

# 40. Icon Usage

Gunakan satu icon library secara konsisten.

Contoh:

**Lucide**

Jangan:

* menggunakan emoji sebagai interface utama
* mencampurkan beberapa icon library
* menggunakan icon jika teks lebih jelas

---

# 41. Cards

Card hanya digunakan ketika menunjukkan grouping.

Hindari:

```text
┌──────── card ────────┐
│ ┌──── another card ┐ │
│ └──────────────────┘ │
└──────────────────────┘
```

Sebagian besar konten dapat dipisahkan menggunakan:

* spacing
* typography
* divider

bukan card.

---

# 42. Dashboard Philosophy

Home bukan dashboard enterprise.

Tidak perlu:

```text
Balance Card
Expense Card
Income Card
Savings Card
Transaction Card
Budget Card
AI Insight Card
```

Lebih baik:

```text
Available
Rp4.250.000

Spent
Rp1.420.000

────────

Finara input

────────

Recent
...
```

---

# 43. Profile

Profile dibuat minimal.

```text
Profile

Bagus

Accounts
Categories
Preferences

Appearance
Currency

Data & Privacy

Sign out
```

Tidak perlu dashboard profile terpisah.

---

# 44. Settings

Settings menggunakan progressive disclosure.

Hal yang jarang digunakan tidak perlu muncul di halaman utama.

Contoh:

```text
Preferences
    Currency
    Language
    Appearance

Finance
    Accounts
    Categories

AI
    AI preferences

Security
    Data & privacy
```

---

# 45. MVP Features

Versi pertama Finara cukup memiliki:

1. Authentication
2. Home
3. Balance overview
4. Manual transaction
5. AI transaction input
6. Expense / income
7. Categories
8. Accounts
9. Transaction history
10. Transaction search
11. Budget
12. Basic AI financial queries
13. Profile & settings

Hindari feature creep sebelum fitur tersebut matang.

---

# 46. Phase 2

Setelah MVP stabil:

* recurring transactions
* financial goals
* smart monthly summaries
* AI spending insights
* natural-language transaction search
* automatic categorization improvement
* export data
* PWA
* notification
* MCP server

---

# 47. Features to Avoid Initially

Jangan langsung memasukkan:

* investment tracking
* crypto
* stock market
* bank synchronization
* debt management kompleks
* tax
* invoice
* accounting reports
* business bookkeeping
* social features
* marketplace
* financial news

Hal-hal tersebut mengurangi fokus produk.

---

# 48. Suggested User Flow

## First Visit

```text
Landing
   ↓
Create account
   ↓
Create first account
   ↓
Home
```

Onboarding maksimal beberapa langkah.

---

## First Transaction

```text
Home

"makan ayam 25rb"

↓

AI Preview

Lunch
Rp25.000
Food & Drink

↓

Save

↓

Home updated
```

---

# 49. Desktop Behavior

Finara tetap mempertahankan mobile layout.

Contoh:

```text
┌──────────────────────────────────────────────────────┐
│                                                      │
│                 ┌──────────────┐                     │
│                 │    Finara    │                     │
│                 │              │                     │
│                 │              │                     │
│                 │              │                     │
│                 │              │                     │
│                 │              │                     │
│                 │              │                     │
│                 │              │                     │
│                 │  Navigation  │                     │
│                 └──────────────┘                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Tidak perlu membuat desktop sidebar hanya karena tersedia ruang.

Ini merupakan keputusan desain produk, bukan kekurangan responsive design.

---

# 50. Responsive Rules

```text
< 480px
Full viewport

≥ 480px
Centered mobile container

≥ 768px
Tetap centered

≥ 1024px
Tetap centered
```

Optional desktop enhancement hanya berupa:

* subtle page background
* keyboard shortcuts
* hover states

Bukan perubahan architecture interface.

---

# 51. Suggested Technical Stack

Frontend:

```text
Next.js
TypeScript
Tailwind CSS
```

UI primitive:

```text
Radix UI
```

Gunakan hanya primitive yang dibutuhkan.

Jangan menjadikan component library sebagai design language Finara.

Backend:

```text
Next.js API / Node.js
```

Database:

```text
PostgreSQL
```

ORM:

```text
Drizzle
```

atau:

```text
Prisma
```

Validation:

```text
Zod
```

AI:

```text
LLM Provider
+
Structured Output
+
Tool Calling
```

---

# 52. Design System

Gunakan design tokens sederhana.

```text
spacing
radius
font size
font weight
foreground
background
muted
border
accent
danger
success
```

Tidak perlu design token untuk setiap kemungkinan visual.

---

# 53. Component Strategy

Komponen utama:

```text
AppShell
BottomNavigation

Balance
TransactionList
TransactionRow

AIComposer
AITransactionPreview

BudgetProgress

BottomSheet

AmountInput
CategoryPicker
AccountPicker
```

Hindari membuat abstraction sebelum benar-benar dibutuhkan.

---

# 54. AI UX Principles

AI tidak boleh terasa seperti fitur terpisah yang ditempelkan ke aplikasi.

Buruk:

```text
Home
Transactions
Budget
✨ AI CHAT
```

Lebih baik:

```text
Home

Available
Rp4.250.000

[ Catat sesuatu... ]

Recent
```

AI menjadi bagian dari interaction model Finara.

---

# 55. AI Response Style

Finara harus:

* concise
* factual
* contextual
* calm

Finara tidak menggunakan kalimat filler.

Buruk:

> Tentu saja! Saya dengan senang hati akan membantu Anda menganalisis pengeluaran bulan ini.

Baik:

> Bulan ini kamu menghabiskan **Rp1,42 jt**.

> Terbesar di **Food — Rp480 rb**.

---

# 56. AI Safety

AI tidak boleh memberikan klaim financial advice yang terlalu absolut.

Bedakan:

**financial information**

dengan:

**professional financial advice**

AI sebaiknya memberikan insight berdasarkan data pengguna seperti:

```text
Your food spending increased 18%.
```

bukan klaim:

```text
You should invest Rp2 million into X.
```

---

# 57. Privacy

Karena transaksi merupakan data sensitif:

* authorization harus dilakukan di server
* setiap query dibatasi berdasarkan user
* jangan memasukkan seluruh database ke prompt
* kirim data minimum yang diperlukan ke AI
* secret/API key hanya tersedia di server
* log AI tidak boleh menyimpan data sensitif tanpa tujuan

---

# 58. Success Metrics

Metrik utama:

### Time to Transaction

Target:

**< 10 detik**

dari input hingga transaksi tercatat.

### Interaction Count

AI transaction:

**1–2 interaction utama**

### AI Parsing Success

Persentase transaksi natural language yang dapat dipahami tanpa edit.

### Weekly Tracking

Jumlah pengguna yang masih mencatat transaksi setelah satu minggu.

---

# 59. Portfolio Value

Finara harus menunjukkan kemampuan:

```text
Product Thinking
UI/UX
Frontend Engineering
Backend Engineering
Database Design
AI Integration
Structured Output
Tool Calling
Responsive Design
Application Architecture
```

Project tidak dinilai berdasarkan banyaknya fitur.

Nilai portfolio datang dari:

> **seberapa matang sebuah problem kecil diselesaikan.**

---

# 60. Final Product Principle

Setiap keputusan desain Finara harus lolos tiga pertanyaan:

**Apakah pengguna membutuhkan ini?**

**Apakah bisa dibuat lebih sederhana?**

**Apakah elemen ini membantu pengguna memahami uang mereka?**

Jika jawabannya tidak, hapus.

Finara harus terasa seperti:

> **finance app yang kebetulan sangat pintar**

bukan:

> **AI demo yang kebetulan bisa mencatat uang.**

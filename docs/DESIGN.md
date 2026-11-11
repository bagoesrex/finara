# Finara Design System & UI/UX Guidelines

## 1. Visual Philosophy: *Tactile Financial Precision*

Finara dirancang dengan standar visual tinggi (*anti-slop*), menolak estetika klise antarmuka AI generik dan dashboard SaaS yang membosankan.

### Anti-Slop Principles:
1. **No AI Clichés:** Dilarang menggunakan gradien ungu-biru neon, ikon bintang berkilau (*sparkles*) yang berlebihan, maskot robotik kartun, dan efek *glassmorphism* buram yang mengaburkan teks.
2. **No Nested Cards:** Hindari kartu di dalam kartu (*cards inside cards*). Gunakan tipografi yang kuat, garis batas halus (1px hairline dividers), dan whitespace untuk membedakan kelompok informasi.
3. **Motion with Intent:** Animasi hanya hadir untuk menjelaskan perubahan status fisik antarmuka (misalnya: drawer bawah yang meluncur naik secara pegas saat AI selesai mengurai input, atau bar progres budget yang terisi secara halus). Tidak ada animasi dekoratif yang berputar tanpa tujuan.
4. **Information Over Decoration:** Angka dan status keuangan adalah bintang utama aplikasi. Setiap warna dan badge harus memiliki makna fungsional.

---

## 2. Ergonomi & Layout Mobile-First

- **Maximum Application Container:** `440px` lebar maksimum, diposisikan di tengah viewport desktop dengan latar belakang netral.
- **Thumb Zone Design:**
  - Komponen interaksi utama (Bottom Navigation, AI Composer Bar, Action Buttons) diletakkan di 40% area bawah layar agar nyaman dijangkau satu tangan.
  - Target sentuhan (*touch target*) minimal **44x44px** dengan ruang antar tombol minimal 8px.
- **Safe Area Insets:** Mendukung penuh notch layar atas dan home indicator bar bawah (`pb-safe`, `pt-safe`).

---

## 3. Palet Warna (Color Tokens)

Finara mendukung tema **Dark Obsidian** (default untuk kenyamanan mata) dan **Light Daylight** yang bersih.

### Dark Obsidian (Default)
| Token | Hex Value | Penggunaan |
|---|---|---|
| `bg-base` | `#090A0F` | Latar belakang aplikasi utama |
| `bg-surface` | `#12141D` | Kartu ringkasan & bottom drawer |
| `bg-elevated`| `#1A1D2B` | Input field, hover state, dropdown |
| `border-subtle` | `#232738` | Border pemisah halus (1px) |
| `text-primary` | `#F8FAFC` | Angka saldo, judul halaman, nilai transaksi |
| `text-secondary` | `#94A3B8` | Label tanggal, nama kategori, catatan |
| `text-muted` | `#64748B` | Timestamp, instruksi placeholder |

### Light Daylight
| Token | Hex Value | Penggunaan |
|---|---|---|
| `bg-base` | `#F8FAFC` | Latar belakang aplikasi utama |
| `bg-surface` | `#FFFFFF` | Kartu putih bersih |
| `bg-elevated`| `#F1F5F9` | Input field & pill filter |
| `border-subtle` | `#E2E8F0` | Border pembatas elemen |
| `text-primary` | `#0F172A` | Teks utama & angka keuangan |
| `text-secondary` | `#475569` | Keterangan subteks |
| `text-muted` | `#94A3B8` | Placeholder |

### Semantic & Status Tokens
| Token | Hex Value | Makna |
|---|---|---|
| `accent-primary` | `#10B981` (Emerald) | Tombol aksi utama, saldo positif |
| `status-expense` | `#F43F5E` (Rose) | Nominal pengeluaran, over-budget warning |
| `status-income` | `#10B981` (Mint) | Nominal pemasukan, budget safe |
| `status-warning` | `#F59E0B` (Amber) | Peringatan mendekati batas budget (>80%) |

---

## 4. Tipografi & Format Angka

- **Primary Font Family:** `Plus Jakarta Sans`, sans-serif (modern, ramah di layar mobile).
- **Tabular Figures:**
  Semua angka nominal keuangan wajib menggunakan CSS class:
  ```css
  font-variant-numeric: tabular-nums;
  ```
  Ini mencegah angka bergoyang atau melompat horizontal saat nilainya berubah dinamis.
- **Standar Ukuran Teks Mobile (Anti Teks Terlalu Kecil):**
  - `Hero & Amount Display`: 28px - 32px / Bold / Tabular (sangat jelas terbaca sekilas).
  - `Section Title`: 18px - 20px / SemiBold
  - `Input Field Text`: 16px / Regular (wajib minimal 16px untuk mencegah auto-zoom di browser mobile seperti iOS Safari saat focus).
  - `Body / Row Title`: 14px - 15px / Medium
  - `Meta / Caption`: 12px - 13px / Medium (dilarang menggunakan font di bawah 12px agar tidak buram di layar smartphone).

---

## 5. Komponen Utama & Interaksi Mikro

### A. The Persistent AI Composer
- Diletakkan di atas bottom navigation pada halaman Home atau mengambang dengan latar surface terangkat.
- Menyerupai *chat input bar*:
  - Icon mikrofon / send yang tegas.
  - Placeholder edukatif bergulir (*"Makan siang 25rb"*, *"Beli bensin 50rb pake bca"*).
  - Indikator parsing: Animasi garis progress tipis (2px) emerald di atas input saat request dikirim (latensi < 1s).

### B. The Tactile Bottom Sheet (Confirmation Drawer)
- Menggunakan pola pegas fisik (*spring physics*) yang mengikuti gestur sentuhan jari:
  - Swipe ke bawah untuk membatalkan draf.
  - Nominal angka ditampilkan besar dengan pill kategori yang dapat diganti dengan 1 tap.
  - Tombol simpan berukuran penuh (*full-width CTA*) dengan haptic feedback saat ditekan.

### C. Budget Progress Gauge
- Menggunakan visual linear terukur, bukan lingkaran grafik donat yang membuang ruang vertikal.
- Berubah warna secara mulus dari Emerald (0-75%) -> Amber (76-90%) -> Rose (>90%).

### D. Field Input Nominal & Keypad Numerik Mobile
- **Keypad Numerik Wajib:** Semua input nominal mata uang harus menyertakan atribut `inputMode="numeric"` dan `pattern="[0-9]*"` sehingga hanya keypad angka yang muncul di layar sentuh mobile.
- **Strict Non-Negative Sanitization:**
  - Hanya menerima digit angka positif (0–9).
  - Tanda minus `-`, tanda plus `+`, koma `,`, titik `.`, dan huruf abjad diblokir langsung pada level event `onChange` / `onKeyDown`.
  - Nilai nominal tidak dapat diisi angka kurang dari 0 (hanya integer positif).
- **Format Rupiah Real-Time:**
  - Menampilkan angka berformat mata uang lokal secara visual saat diketik (contoh: input `50000` otomatis ditampilkan sebagai `Rp50.000` dengan font tabular).
  - State dan payload yang dikirim ke backend tetap berupa nilai integer murni `int64` tanpa simbol.

### E. Standar Desain Input Field (Bukan Default HTML)
- **Container Terangkat:** Tidak menggunakan border default browser. Field menggunakan surface terangkat (`bg-[#1A1D2B]` di dark mode, `bg-[#F1F5F9]` di light mode) dengan border halus 1px (`border-[#232738]` / `border-[#E2E8F0]`).
- **Touch Ergonomics:** Tinggi field minimal 48px–52px dengan sudut membulat modern (`rounded-xl` / 14px), sangat nyaman dijangkau dan ditekan oleh jempol.
- **Focus State Elegan:** Transisi halus 150ms saat fokus dengan ring aksen emerald teredam (`focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500`).
- **Prefix Terintegrasi:** Simbol mata uang `Rp` atau ikon diletakkan rapi di dalam container input dengan warna muted, bukan elemen terpisah yang canggung.
- **Quick Clear Button:** Tombol hapus instan (ikon X halus) muncul otomatis saat field berisi teks/angka, memungkinkan reset dalam 1 tap tanpa perlu menahan backspace.

---

## 6. Nada Bahasa & Copywriting (Voice of Finara)

- **Glanceable UI (Bebas Teks Berlebihan):**
  - Pengguna mobile malas membaca teks panjang. Singkirkan paragraf pengantar, instruksi panjang, atau dinding teks yang tidak diperlukan.
  - Gunakan label dan aksi ringkas 1–3 kata: "Simpan", "Batal", "Tambah manual", "Hapus transaksi".
  - Field harus intuitif dari placeholder dan konteksnya tanpa membutuhkan teks petunjuk tambahan di bawahnya.
- **Bahasa Indonesia Lugas:** Gunakan kata kerja aktif dan kalimat singkat sehari-hari (*Sentence case*):
  - *Baik:* "Simpan pengeluaran", "Coba lagi", "Batal".
  - *Buruk:* "Submit form", "Klik di sini untuk melanjutkan proses penyimpanan".
- **Netral & Faktual:** Finara tidak pernah menghakimi pengguna atau menggunakan gaya bahasa yang sok menggurui:
  - *Dihindari:* "Aduh, kamu boros banget minggu ini!"
  - *Direkomendasikan:* "Pengeluaran minggu ini Rp450.000, 15% lebih tinggi dari minggu lalu."

# Finara Product Requirements Document (PRD)

**AI-Powered Personal Finance Companion**  
*Effortless, fast, and distraction-free mobile-first money tracking.*

---

## 1. Product Vision & Philosophy

Finara dirancang untuk mengubah aktivitas pencatatan keuangan pribadi dari tugas administratif yang melelahkan menjadi interaksi yang secepat dan seringan mengirim pesan singkat.

### Nilai Inti:
1. **Simple before powerful:** Selesaikan kebutuhan utama (catat, lihat saldo, pantau budget) dengan gesit sebelum menambah kerumitan.
2. **Mobile-first & zero-friction:** Dirancang optimal untuk penggunaan satu tangan di smartphone (layar 360–440px).
3. **AI as an interaction layer:** AI bertindak sebagai parser bahasa alami (natural language transaction composer) dan asisten query data, bukan sekadar chatbot obrolan kosong (*no conversational filler*).
4. **Zero-reload & instant persistence:** Seluruh navigasi dan mutasi data terasa instan melalui caching TanStack Query yang tersimpan (*persisted cache*), menyajikan data saldo dan riwayat tanpa *blank screen* saat aplikasi dibuka kembali.
5. **No AI slop:** Tidak ada gradien ungu generik, tidak ada dekorasi bintang/sparkle tanpa fungsi, tidak ada jargon perbankan yang rumit.
6. **Every element earns its place:** Setiap elemen UI memiliki tujuan hierarki informasi yang jelas.

---

## 2. Target Pengguna

- **Demografi:** Mahasiswa, fresh graduate, pekerja muda, dan freelancer di Indonesia berusia 18–35 tahun.
- **Karakteristik & Masalah:**
  - Terbiasa berkomunikasi lewat pesan instan (WhatsApp, Telegram).
  - Malas membuka form berbelit-belit (pilih rekening -> pilih kategori -> isi nominal -> pilih tanggal -> ketik catatan).
  - Sering lupa mencatat pengeluaran harian kecil (kopi, makan siang, parkir, ojek online).
  - Membutuhkan visibilitas cepat atas sisa budget bulanan dan posisi saldo akun.

---

## 3. Alur Interaksi Kunci

### A. Input Transaksi Berbasis AI (Primary Flow)
Pengguna mengetik di AI Composer pada halaman Home:
> `Makan siang warteg 25rb`

1. **AI Parsing:** Request dikirim ke backend Go yang memanggil provider OpenAI-compatible (9router, OpenRouter, dll) dengan mode JSON terstruktur.
2. **Review Sheet (Drawer):** Sheet konfirmasi muncul secara taktil dan halus:
   - **Tipe:** Pengeluaran
   - **Nominal:** Rp25.000
   - **Kategori:** Makanan & Minuman
   - **Akun:** Rekening Utama / Tunai
   - **Tanggal:** Hari ini (WIB)
3. **Simpan:** 1 tap untuk konfirmasi. Transaksi langsung masuk ke daftar riwayat dan saldo ter-update secara optimistik tanpa reload.

### B. Input Transaksi Manual (Fallback Flow)
- Tombol cepat di Home membuka form minimalis dengan nilai default cerdas (tanggal hari ini, akun default, kategori terakhir).
- Digunakan saat offline atau saat pengguna ingin memasukkan angka secara eksplisit.

### C. Ringkasan & Pertanyaan Keuangan Alami (Financial Query)
Pengguna dapat mengetik pertanyaan pada AI Composer:
> `Berapa pengeluaran makan bulan ini?`
> `Sisa budget saya berapa?`

Backend memetakan intent dan menjalankan fungsi analitik PostgreSQL berizin, lalu mengembalikan jawaban ringkas faktual tanpa basa-basi AI.

### D. Standar Input Nominal & Keypad Mobile
- **Keypad Numerik Murni:** Semua field input nominal uang (manual draft, edit transaksi, alokasi budget) wajib memicu keypad angka pada perangkat mobile (`inputMode="numeric"`, `pattern="[0-9]*"`).
- **Sanitasi Ketat:** Karakter non-angka (huruf, tanda minus, koma, simbol) diblokir secara langsung saat pengetikan.
- **Batas Nilai Non-Negatif:** Nominal tidak dapat diisi nilai kurang dari 0 atau bertanda minus. Transaksi mewajibkan nominal positif minimal 1 Rupiah.
- **Formatting IDR Otomatis:** Input angka diformat secara visual dengan pemisah ribuan titik (misal `Rp25.000`), sementara nilai yang dikirim ke backend tetap integer utuh tanpa desimal.

---

## 4. Ruang Lingkup MVP (Scope)

### Core Features (In Scope):
1. **Autentikasi & Zero Onboarding (Pendekatan Instant Jump):**
   - Registrasi & Login sederhana (email + password).
   - **Zero Onboarding:** Setelah registrasi berhasil, pengguna langsung diarahkan ke halaman Home tanpa step onboarding sama sekali (Time-to-Value = 0 detik).
   - Sistem secara otomatis membuat akun default "Tunai" (saldo Rp0) dan kategori standar bawaan (Makanan & Minuman, Transportasi, Belanja, Tagihan, Gaji, dll).
   - Pengguna dapat menyesuaikan nama akun, menambah rekening baru (Bank/E-Wallet), atau mengatur saldo awal kapan saja melalui menu Pengaturan Akun.
2. **Dashboard Home:**
   - Total saldo gabungan.
   - Ringkasan pemasukan & pengeluaran bulan berjalan.
   - Persistent AI Composer (input teks cepat).
   - 4-5 transaksi terbaru dengan visualisasi kategori jelas.
3. **Manajemen Transaksi (Activity):**
   - Riwayat transaksi dengan pagination/infinite scroll.
   - Filter pencarian teks & nominal IDR.
   - Detail, edit, dan soft-delete transaksi.
4. **Manajemen Budget (Monthly Category Budget):**
   - Alokasi batas pengeluaran per kategori per bulan.
   - Indikator progres visual (persentase terpakai, sisa limit).
5. **Profil & Pengaturan Sederhana:**
   - Manajemen nama akun & rekening.
   - Transparansi data & kebijakan privasi.
   - Tombol logout yang membersihkan sesi dan persisted cache.

### Out of Scope (Post-MVP):
- Sinkronisasi otomatis bank/Open Finance (BCA, Mandiri, dll).
- Pelacakan investasi, saham, crypto, dan reksa dana.
- Manajemen utang-piutang rumit atau penagihan invoice.
- Fitur sosial, sharing pengeluaran antar pengguna (*split bill*).
- Laporan akuntansi kompleks (neraca saldo, jurnal umum).

---

## 5. Non-Functional Requirements & Metrik Sukses

- **Kecepatan Input:** Pengguna dapat menyelesaikan pencatatan transaksi dalam waktu kurang dari 10 detik.
- **Latensi AI Parsing:** Response dari AI Composer parsing < 1.5 detik.
- **Client Latency:** Navigasi antar halaman < 100ms dengan TanStack Query caching & zero reload.
- **Akurasi Moneter:** Seluruh nominal disimpan dan dihitung dalam satuan integer terkecil (Rupiah utuh / BigInt) tanpa floating-point math.
- **Data Isolation:** Isolasi multitenant penuh di backend Go—setiap query SQL wajib menyertakan filter `user_id`.

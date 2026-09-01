import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Database,
  LogOut,
  MessageSquareText,
  Server,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Data & privasi" };

export default function PrivacyPage() {
  return (
    <main className="page privacy-page page-enter">
      <Link className="back-link" href="/profile">
        <ChevronLeft aria-hidden="true" size={18} />
        Kembali ke profil
      </Link>
      <PageHeader
        eyebrow="Privasi"
        title="Data & privasi"
        description="Ringkasan data yang Finara gunakan untuk mencatat dan menjelaskan keuanganmu."
      />

      <section className="section-block privacy-section" aria-labelledby="stored-data-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Penyimpanan</p>
            <h2 id="stored-data-title">Data yang tersimpan</h2>
          </div>
        </div>
        <ul className="privacy-list" role="list">
          <li>
            <span className="privacy-list__icon" aria-hidden="true">
              <Database size={19} />
            </span>
            <div>
              <h3>Akun dan catatan keuangan</h3>
              <p>
                Nama, email, akun, kategori, transaksi, dan budget disimpan agar
                tetap tersedia saat kamu kembali.
              </p>
            </div>
          </li>
          <li>
            <span className="privacy-list__icon" aria-hidden="true">
              <Server size={19} />
            </span>
            <div>
              <h3>Perhitungan di server</h3>
              <p>
                Saldo dan ringkasan dihitung dari data tersimpan. Percakapan AI
                tidak pernah menjadi sumber catatan keuangan.
              </p>
            </div>
          </li>
        </ul>
      </section>

      <section className="section-block privacy-section" aria-labelledby="ai-data-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AI</p>
            <h2 id="ai-data-title">Data yang diproses AI</h2>
          </div>
        </div>
        <ul className="privacy-list" role="list">
          <li>
            <span className="privacy-list__icon" aria-hidden="true">
              <MessageSquareText size={19} />
            </span>
            <div>
              <h3>Hanya konteks yang diperlukan</h3>
              <p>
                Saat composer digunakan, teks yang kamu kirim dan nama kategori
                yang tersedia dikirim ke penyedia AI untuk memahami permintaanmu.
              </p>
            </div>
          </li>
          <li>
            <span className="privacy-list__icon" aria-hidden="true">
              <ShieldCheck size={19} />
            </span>
            <div>
              <h3>Data tersimpan tetap di Finara</h3>
              <p>
                Saldo, riwayat transaksi, nominal budget, identitas, dan ID
                internal tidak dikirim ke model untuk menjawab pertanyaan.
              </p>
            </div>
          </li>
        </ul>
      </section>

      <section className="section-block privacy-section" aria-labelledby="controls-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Kendali</p>
            <h2 id="controls-title">Kendali saat ini</h2>
          </div>
        </div>
        <ul className="privacy-list" role="list">
          <li>
            <span className="privacy-list__icon" aria-hidden="true">
              <CheckCircle2 size={19} />
            </span>
            <div>
              <h3>Konfirmasi sebelum menyimpan</h3>
              <p>
                Hasil AI selalu ditampilkan sebagai preview yang dapat diperiksa
                dan diubah sebelum transaksi disimpan.
              </p>
            </div>
          </li>
          <li>
            <span className="privacy-list__icon" aria-hidden="true">
              <LogOut size={19} />
            </span>
            <div>
              <h3>Keluar dari sesi aktif</h3>
              <p>
                Tombol Keluar di halaman Profil mengakhiri sesi yang sedang aktif
                di perangkat ini.
              </p>
            </div>
          </li>
        </ul>
      </section>
    </main>
  );
}

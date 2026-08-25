import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  MessageSquareText,
  ScanSearch,
  WalletCards,
} from "lucide-react";

export const metadata: Metadata = { title: "Selamat datang" };

const benefits = [
  {
    icon: MessageSquareText,
    title: "Catat dengan kalimat biasa",
    description: "Tulis “makan 25rb”, lalu periksa sebelum menyimpan.",
  },
  {
    icon: WalletCards,
    title: "Saldo langsung terbaca",
    description: "Lihat posisi uang dan aktivitas terbaru dalam satu alur.",
  },
  {
    icon: ScanSearch,
    title: "Temukan transaksi cepat",
    description: "Riwayat, pencarian, dan budget tetap ringkas.",
  },
];

export default function WelcomePage() {
  return (
    <main className="auth-page welcome-page page-enter">
      <header className="auth-brand">
        <span aria-hidden="true">F</span>
        <strong>Finara</strong>
        <small>Frontend preview</small>
      </header>

      <section className="welcome-hero" aria-labelledby="welcome-title">
        <p className="eyebrow">Keuangan pribadi, tanpa ribet</p>
        <h1 id="welcome-title">Catat cepat. Pahami uangmu dengan tenang.</h1>
        <p>
          Finara membantu kamu mencatat transaksi dan melihat kondisi keuangan
          tanpa terasa seperti memakai software akuntansi.
        </p>
      </section>

      <div className="benefit-list" aria-label="Manfaat utama">
        {benefits.map(({ icon: Icon, title, description }) => (
          <section key={title}>
            <span><Icon aria-hidden="true" size={20} /></span>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </section>
        ))}
      </div>

      <div className="welcome-actions">
        <Link className="primary-button" href="/register">
          Mulai sekarang <ArrowRight aria-hidden="true" size={18} />
        </Link>
        <p>Sudah pernah mencoba? <Link href="/login">Masuk ke demo</Link></p>
      </div>
      <p className="welcome-disclaimer">
        Ini prototipe frontend. Data akan kembali ke awal setelah reload.
      </p>
    </main>
  );
}

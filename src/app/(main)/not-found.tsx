import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty-page page-enter">
      <p className="eyebrow">404</p>
      <h1>Transaksi tidak ditemukan</h1>
      <p>Data contoh yang kamu cari mungkin sudah tidak tersedia.</p>
      <Link className="primary-button" href="/activity">Kembali ke aktivitas</Link>
    </main>
  );
}

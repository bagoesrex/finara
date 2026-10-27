import type { Metadata } from "next";
import { Clock, Layers, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Sedang Dalam Pengembangan",
  description: "Finara sedang dalam tahap pengujian sistem sebelum rilis publik.",
  robots: {
    index: false,
    follow: false,
  },
};

const pillars = [
  {
    icon: Layers,
    title: "Pencatatan Cepat & Sederhana",
    description: "Input transaksi harian dalam hitungan detik dengan alur konfirmasi yang jelas.",
  },
  {
    icon: ShieldCheck,
    title: "Privasi & Otorisasi Ketat",
    description: "Data keuangan tersimpan aman di server, terisolasi per pengguna, dan bebas iklan.",
  },
  {
    icon: Clock,
    title: "Akses Publik Segera Hadir",
    description: "Platform akan dibuka secara bertahap setelah pengujian kestabilan sistem selesai.",
  },
];

export default function UnderDevelopmentPage() {
  return (
    <div className="auth-viewport">
      <div className="auth-shell">
        <div className="auth-content" tabIndex={-1}>
          <main className="auth-page page-enter">
            <header className="auth-brand">
              <span aria-hidden="true">F</span>
              <strong>Finara</strong>
              <small>Personal finance</small>
            </header>

            <section className="welcome-hero">
              <div
                aria-label="Status: Dalam Pengembangan"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--muted)]"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                />
                Tahap Pengembangan
              </div>

              <h1 className="mt-4">Sedang dipersiapkan untuk publik</h1>

              <p>
                Finara adalah pelacak keuangan pribadi yang dirancang cepat dan
                tenang. Saat ini kami sedang menyelesaikan audit kestabilan dan
                keamanan sebelum membuka akses bagi publik.
              </p>
            </section>

            <section aria-label="Sorotan platform" className="benefit-list">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <section key={pillar.title}>
                    <span aria-hidden="true">
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    <div>
                      <h2>{pillar.title}</h2>
                      <p>{pillar.description}</p>
                    </div>
                  </section>
                );
              })}
            </section>

            <footer className="welcome-disclaimer mt-8">
              <p>Finara · Personal Finance System</p>
              <p className="mt-1 text-[var(--faint)]">
                Akses saat ini dibatasi untuk verifikasi internal.
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { CircleHelp, Coins, Languages, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { userProfile } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Profil" };

const preferences = [
  { icon: Coins, label: "Mata uang", value: "Rupiah (IDR)" },
  { icon: Languages, label: "Bahasa", value: "Indonesia" },
  { icon: ShieldCheck, label: "Privasi data", value: "Hanya kamu" },
];

export default function ProfilePage() {
  return (
    <main className="page page-enter">
      <PageHeader eyebrow="Akun" title="Profil" />

      <section className="profile-identity" aria-label="Identitas pengguna">
        <div className="avatar avatar--large" aria-hidden="true">{userProfile.initials}</div>
        <div>
          <h2>{userProfile.name}</h2>
          <p>{userProfile.email}</p>
        </div>
      </section>

      <section className="section-block" aria-labelledby="preferences-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Preferensi</p>
            <h2 id="preferences-title">Pengaturan dasar</h2>
          </div>
        </div>
        <dl className="preference-list">
          {preferences.map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <dt><Icon aria-hidden="true" size={20} />{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="support-note" aria-label="Status prototipe">
        <CircleHelp aria-hidden="true" size={20} />
        <div>
          <h2>Mode prototipe</h2>
          <p>Semua angka di aplikasi ini masih menggunakan data contoh.</p>
        </div>
      </section>
      <p className="app-version">Finara preview | 0.1.0</p>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  CircleHelp,
  Coins,
  Languages,
  LogOut,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useMockFinance } from "@/components/mock-finance-provider";
import { usePrototypeAuth } from "@/components/prototype-auth-provider";
import { getInitials } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

export function ProfileDashboard() {
  const auth = usePrototypeAuth();
  const { accounts } = useMockFinance();
  const router = useRouter();
  const name = auth.user?.name ?? "Pengguna Finara";
  const email = auth.user?.email ?? "Belum tersedia";
  const accountName = accounts[0]?.name ?? "Belum tersedia";
  const isDemo = auth.user?.kind === "demo";
  const preferences = [
    { icon: Coins, label: "Mata uang", value: "Rupiah (IDR)" },
    { icon: Languages, label: "Bahasa", value: "Indonesia" },
    { icon: ShieldCheck, label: "Mode data", value: "Hanya sesi ini" },
  ];

  function handleSignOut() {
    auth.signOut();
    router.replace("/welcome");
  }

  return (
    <main className="page page-enter">
      <PageHeader eyebrow="Akun" title="Profil" />

      <section className="profile-identity" aria-label="Identitas pengguna">
        <div className="avatar avatar--large" aria-hidden="true">
          {getInitials(name)}
        </div>
        <div>
          <h2>{name}</h2>
          <p>{email}</p>
        </div>
      </section>

      <section className="section-block" aria-labelledby="finance-settings-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Keuangan</p>
            <h2 id="finance-settings-title">Pengaturan pencatatan</h2>
          </div>
        </div>
        <Link className="settings-link" href="/profile/finance">
          <span className="settings-link__icon" aria-hidden="true">
            <WalletCards size={20} />
          </span>
          <span className="settings-link__copy">
            <strong>Akun & kategori</strong>
            <small>{accounts.length} akun · Utama: {accountName}</small>
          </span>
          <ChevronRight aria-hidden="true" size={18} />
        </Link>
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
          <p>
            {isDemo
              ? "Kamu sedang melihat skenario data Bagus."
              : "Data onboarding dan transaksi hanya hidup selama sesi ini."}
          </p>
        </div>
      </section>

      <button className="profile-signout" type="button" onClick={handleSignOut}>
        <LogOut aria-hidden="true" size={18} />
        Keluar dari prototipe
      </button>
      <p className="app-version">Finara preview | 0.1.0</p>
    </main>
  );
}

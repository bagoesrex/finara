import type { Metadata } from "next";
import { AuthPageHeader } from "../_components/auth-page-header";
import { RegistrationForm } from "../_components/registration-form";

export const metadata: Metadata = { title: "Buat akun" };

export default function RegisterPage() {
  return (
    <main className="auth-page page-enter">
      <AuthPageHeader
        eyebrow="Mulai dari sini"
        title="Buat akunmu"
        description="Isi identitas dasar, lalu siapkan satu akun keuangan. Prosesnya hanya dua langkah singkat."
      />
      <RegistrationForm />
    </main>
  );
}

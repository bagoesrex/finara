import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPrivateAppState } from "@/server/auth/private-app";
import { AuthPageHeader } from "../_components/auth-page-header";
import { RegistrationForm } from "../_components/registration-form";

export const metadata: Metadata = { title: "Buat akun" };

export default async function RegisterPage() {
  const state = await getPrivateAppState();

  if (state.status === "ready") {
    redirect("/");
  }

  if (state.status === "needs-onboarding") {
    redirect("/onboarding");
  }

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

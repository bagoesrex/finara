import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPrivateAppState } from "@/server/auth/private-app";
import { AuthPageHeader } from "../_components/auth-page-header";
import { LoginForm } from "../_components/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
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
        eyebrow="Pengguna kembali"
        title="Masuk ke Finara"
        description="Masukkan email dan password akunmu untuk melanjutkan."
      />
      <LoginForm />
    </main>
  );
}

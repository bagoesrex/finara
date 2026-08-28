import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPrivateAppState } from "@/server/auth/private-app";
import { OnboardingForm } from "../_components/onboarding-form";

export const metadata: Metadata = { title: "Siapkan akun pertama" };

export default async function OnboardingPage() {
  const state = await getPrivateAppState();

  if (state.status === "signed-out") {
    redirect("/register");
  }

  if (state.status === "ready") {
    redirect("/");
  }

  return (
    <main className="auth-page onboarding-page page-enter">
      <header className="auth-page-header onboarding-header">
        <div className="onboarding-progress" aria-label="Langkah 1 dari 1">
          <span />
        </div>
        <p className="eyebrow">Langkah 1 dari 1</p>
        <h1>Siapkan akun pertama</h1>
        <p>
          Beri tahu Finara saldo akunmu saat ini agar Home langsung berguna.
        </p>
      </header>
      <OnboardingForm email={state.viewer.email} />
    </main>
  );
}

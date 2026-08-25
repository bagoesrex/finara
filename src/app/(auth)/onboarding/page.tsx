import type { Metadata } from "next";
import { OnboardingForm } from "../_components/onboarding-form";

export const metadata: Metadata = { title: "Siapkan akun pertama" };

export default function OnboardingPage() {
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
      <OnboardingForm />
    </main>
  );
}

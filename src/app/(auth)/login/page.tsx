import type { Metadata } from "next";
import { AuthPageHeader } from "../_components/auth-page-header";
import { LoginForm } from "../_components/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="auth-page page-enter">
      <AuthPageHeader
        eyebrow="Pengguna kembali"
        title="Masuk ke Finara"
        description="Gunakan email yang tersedia dan password apa pun untuk membuka data demo Bagus."
      />
      <LoginForm />
    </main>
  );
}

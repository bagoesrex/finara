"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import { AuthField } from "@/app/(auth)/_components/auth-field";
import { focusFirstError } from "@/app/(auth)/_components/focus-first-error";
import {
  validateRegistration,
  type RegistrationErrors,
  type RegistrationInput,
} from "@/lib/auth";
import { authClient } from "@/lib/auth-client";

const initialInput: RegistrationInput = {
  name: "",
  email: "",
  password: "",
};

export function RegistrationForm() {
  const router = useRouter();
  const [input, setInput] = useState(initialInput);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function clearError(field: keyof RegistrationInput) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  }

  function finishWithError() {
    setInput((current) => ({ ...current, password: "" }));
    setFormError("Belum bisa melanjutkan. Coba lagi atau masuk dengan akunmu.");
    submittingRef.current = false;
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors = validateRegistration(input);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(event.currentTarget, Object.keys(nextErrors));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const registration = await authClient.signUp.email({
        name: input.name.trim(),
        email: input.email.trim(),
        password: input.password,
      });

      if (registration.error) {
        finishWithError();
        return;
      }

      const signIn = await authClient.signIn.email({
        email: input.email.trim(),
        password: input.password,
      });

      if (signIn.error) {
        finishWithError();
        return;
      }

      router.replace("/onboarding");
      router.refresh();
    } catch {
      finishWithError();
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthField
        id="register-name"
        label="Nama"
        name="name"
        autoComplete="name"
        value={input.name}
        error={errors.name}
        onChange={(event) => {
          setInput((current) => ({ ...current, name: event.target.value }));
          if (errors.name || formError) clearError("name");
        }}
        required
      />
      <AuthField
        id="register-email"
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={input.email}
        error={errors.email}
        onChange={(event) => {
          setInput((current) => ({ ...current, email: event.target.value }));
          if (errors.email || formError) clearError("email");
        }}
        required
      />
      <AuthField
        id="register-password"
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={input.password}
        error={errors.password}
        onChange={(event) => {
          setInput((current) => ({
            ...current,
            password: event.target.value,
          }));
          if (errors.password || formError) clearError("password");
        }}
        required
      />
      <p className="auth-field-hint">Minimal 8 karakter.</p>

      {formError ? (
        <p className="auth-prototype-note" role="alert">
          {formError}
        </p>
      ) : null}

      <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Membuat akun…" : "Lanjut siapkan akun"}
        <ArrowRight aria-hidden="true" size={18} />
      </button>

      <p className="auth-switch">
        Sudah punya akun? <Link href="/login">Masuk</Link>
      </p>
    </form>
  );
}

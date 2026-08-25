"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { usePrototypeAuth } from "@/components/prototype-auth-provider";
import {
  validateRegistration,
  type RegistrationErrors,
  type RegistrationInput,
} from "@/lib/auth";
import { AuthField } from "./auth-field";
import { focusFirstError } from "./focus-first-error";

const initialInput: RegistrationInput = {
  name: "",
  email: "",
  password: "",
};

export function RegistrationForm() {
  const { register } = usePrototypeAuth();
  const [input, setInput] = useState(initialInput);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function clearError(field: keyof RegistrationInput) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors = validateRegistration(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(event.currentTarget, Object.keys(nextErrors));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    register({ name: input.name, email: input.email });
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
          if (errors.name) clearError("name");
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
          if (errors.email) clearError("email");
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
          if (errors.password) clearError("password");
        }}
        required
      />
      <p className="auth-field-hint">Minimal 8 karakter untuk simulasi ini.</p>

      <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Menyiapkan…" : "Lanjut siapkan akun"}
        <ArrowRight aria-hidden="true" size={18} />
      </button>

      <p className="auth-prototype-note">
        Identitas dan password belum dikirim atau disimpan. Semua state kembali
        ke awal saat halaman dimuat ulang.
      </p>
      <p className="auth-switch">
        Sudah punya akun? <Link href="/login">Masuk</Link>
      </p>
    </form>
  );
}

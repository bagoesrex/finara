"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { usePrototypeAuth } from "@/components/prototype-auth-provider";
import {
  validateSignIn,
  type SignInErrors,
  type SignInInput,
} from "@/lib/auth";
import { AuthField } from "./auth-field";
import { focusFirstError } from "./focus-first-error";

const initialInput: SignInInput = {
  email: "bagus@finara.id",
  password: "",
};

export function LoginForm() {
  const { signIn } = usePrototypeAuth();
  const [input, setInput] = useState(initialInput);
  const [errors, setErrors] = useState<SignInErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors = validateSignIn(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(event.currentTarget, Object.keys(nextErrors));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    signIn(input.email);
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <AuthField
        id="login-email"
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
          if (errors.email) {
            setErrors((current) => ({ ...current, email: undefined }));
          }
        }}
        required
      />
      <AuthField
        id="login-password"
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={input.password}
        error={errors.password}
        onChange={(event) => {
          setInput((current) => ({
            ...current,
            password: event.target.value,
          }));
          if (errors.password) {
            setErrors((current) => ({ ...current, password: undefined }));
          }
        }}
        required
      />

      <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Membuka demo…" : "Masuk ke demo"}
        <ArrowRight aria-hidden="true" size={18} />
      </button>

      <p className="auth-prototype-note">
        Password hanya divalidasi di perangkat ini lalu dibuang. Belum ada
        session atau akun server.
      </p>
      <p className="auth-switch">
        Belum punya akun? <Link href="/register">Buat akun</Link>
      </p>
    </form>
  );
}

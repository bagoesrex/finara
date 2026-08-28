"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import { AuthField } from "@/app/(auth)/_components/auth-field";
import { focusFirstError } from "@/app/(auth)/_components/focus-first-error";
import { authClient } from "@/lib/auth-client";
import {
  validateSignIn,
  type SignInErrors,
  type SignInInput,
} from "@/lib/auth";

const initialInput: SignInInput = {
  email: "",
  password: "",
};

export function LoginForm() {
  const router = useRouter();
  const [input, setInput] = useState(initialInput);
  const [errors, setErrors] = useState<SignInErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  function finishWithError() {
    setInput((current) => ({ ...current, password: "" }));
    setFormError("Email atau password tidak sesuai.");
    submittingRef.current = false;
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors = validateSignIn(input);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(event.currentTarget, Object.keys(nextErrors));
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email: input.email.trim(),
        password: input.password,
      });

      if (result.error) {
        finishWithError();
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      finishWithError();
    }
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
          setFormError("");
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
          setFormError("");
          if (errors.password) {
            setErrors((current) => ({ ...current, password: undefined }));
          }
        }}
        required
      />

      {formError ? (
        <p className="auth-prototype-note" role="alert">
          {formError}
        </p>
      ) : null}

      <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Memeriksa akun…" : "Masuk"}
        <ArrowRight aria-hidden="true" size={18} />
      </button>

      <p className="auth-switch">
        Belum punya akun? <Link href="/register">Buat akun</Link>
      </p>
    </form>
  );
}

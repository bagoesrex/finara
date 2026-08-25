import type { ComponentProps } from "react";

type AuthFieldProps = ComponentProps<"input"> & {
  error?: string;
  label: string;
};

export function AuthField({
  error,
  id,
  label,
  ...inputProps
}: AuthFieldProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <input
        {...inputProps}
        id={id}
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
      />
      {error ? (
        <small id={errorId} role="alert">
          {error}
        </small>
      ) : null}
    </label>
  );
}

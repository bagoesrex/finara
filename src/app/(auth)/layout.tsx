import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-viewport">
      <a className="skip-link" href="#auth-content">
        Lewati ke konten utama
      </a>
      <div className="auth-shell">
        <div className="auth-content" id="auth-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}

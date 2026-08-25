"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PrototypeAuthState } from "@/lib/auth";
import { usePrototypeAuth } from "./prototype-auth-provider";

function getRedirectTarget(
  status: PrototypeAuthState["status"],
  pathname: string,
): string | null {
  if (status === "ready") return "/";
  if (status === "needs-onboarding" && pathname !== "/onboarding") {
    return "/onboarding";
  }
  if (status === "signed-out" && pathname === "/onboarding") {
    return "/register";
  }
  return null;
}

export function PrototypeAuthShell({ children }: { children: ReactNode }) {
  const auth = usePrototypeAuth();
  const pathname = usePathname();
  const router = useRouter();
  const redirectTarget = getRedirectTarget(auth.status, pathname);

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  return (
    <div className="auth-viewport">
      <a className="skip-link" href="#auth-content">
        Lewati ke konten utama
      </a>
      <div className="auth-shell">
        <div className="auth-content" id="auth-content" tabIndex={-1}>
          {redirectTarget ? (
            <div className="route-status" role="status">
              <span aria-hidden="true" />
              Menyiapkan alur prototipe…
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

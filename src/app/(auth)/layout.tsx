import type { ReactNode } from "react";
import { PrototypeAuthShell } from "@/components/prototype-auth-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <PrototypeAuthShell>{children}</PrototypeAuthShell>;
}

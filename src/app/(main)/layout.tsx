import type { ReactNode } from "react";
import { PrototypePrivateApp } from "@/components/prototype-private-app";

export default function MainLayout({ children }: { children: ReactNode }) {
  return <PrototypePrivateApp>{children}</PrototypePrivateApp>;
}

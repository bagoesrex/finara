import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { PrototypePrivateApp } from "@/components/prototype-private-app";
import { getPrivateAppState } from "@/server/auth/private-app";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const state = await getPrivateAppState();

  if (state.status === "signed-out") {
    redirect("/welcome");
  }

  if (state.status === "needs-onboarding") {
    redirect("/onboarding");
  }

  return (
    <PrototypePrivateApp accounts={state.accounts} viewer={state.viewer}>
      {children}
    </PrototypePrivateApp>
  );
}

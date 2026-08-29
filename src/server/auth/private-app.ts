import "server-only";

import { cache } from "react";

import type { PrivateAppState } from "@/lib/viewer";
import { getSessionViewer } from "@/server/auth/session";
import { db } from "@/server/db/client";

export const getPrivateAppState = cache(async (): Promise<PrivateAppState> => {
  const viewer = await getSessionViewer();

  if (!viewer) {
    return { status: "signed-out" };
  }

  const account = await db.account.findFirst({
    where: { userId: viewer.id },
    select: { id: true },
  });

  if (!account) {
    return { status: "needs-onboarding", viewer };
  }

  return { status: "ready", viewer };
});

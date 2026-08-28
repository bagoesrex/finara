import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import type { Viewer } from "@/lib/viewer";
import { auth } from "@/server/auth/auth";

export const getSessionViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
});

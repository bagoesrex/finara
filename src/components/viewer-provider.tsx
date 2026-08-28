"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Viewer } from "@/lib/viewer";

const ViewerContext = createContext<Viewer | null>(null);

export function ViewerProvider({
  children,
  viewer,
}: {
  children: ReactNode;
  viewer: Viewer;
}) {
  return (
    <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
  );
}

export function useViewer(): Viewer {
  const viewer = useContext(ViewerContext);

  if (!viewer) {
    throw new Error("useViewer must be used inside ViewerProvider.");
  }

  return viewer;
}

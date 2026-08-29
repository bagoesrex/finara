"use client";

import type { DehydratedState } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { BottomNavigation } from "@/components/bottom-navigation";
import { FinanceProvider } from "@/components/finance-provider";
import { FinanceQueryProvider } from "@/components/finance-query-provider";
import { ViewerProvider } from "@/components/viewer-provider";
import type { Viewer } from "@/lib/viewer";

export function PrivateApp({
  children,
  dehydratedState,
  monthKey,
  viewer,
}: {
  children: ReactNode;
  dehydratedState: DehydratedState;
  monthKey: string;
  viewer: Viewer;
}) {
  return (
    <div className="app-viewport">
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <ViewerProvider viewer={viewer}>
        <FinanceQueryProvider dehydratedState={dehydratedState}>
          <FinanceProvider monthKey={monthKey}>
            <div className="app-shell">
              <div className="app-content" id="main-content" tabIndex={-1}>
                {children}
              </div>
              <BottomNavigation />
            </div>
          </FinanceProvider>
        </FinanceQueryProvider>
      </ViewerProvider>
    </div>
  );
}

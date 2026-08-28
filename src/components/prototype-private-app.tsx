"use client";

import { useMemo, type ReactNode } from "react";

import { BottomNavigation } from "@/components/bottom-navigation";
import { MockFinanceProvider } from "@/components/mock-finance-provider";
import { PrototypeQueryProvider } from "@/components/prototype-query-provider";
import { ViewerProvider } from "@/components/viewer-provider";
import type { FinanceAccount } from "@/lib/accounts";
import { createOnboardingSummary } from "@/lib/auth";
import { financialSummary } from "@/lib/mock-data";
import type { Viewer } from "@/lib/viewer";

export function PrototypePrivateApp({
  accounts,
  children,
  viewer,
}: {
  accounts: FinanceAccount[];
  children: ReactNode;
  viewer: Viewer;
}) {
  const initialFinance = useMemo(() => {
    const available = accounts.reduce(
      (total, account) => total + account.currentBalance,
      0,
    );

    if (!Number.isSafeInteger(available)) {
      throw new RangeError("Combined account balance is outside the client range.");
    }

    return {
      accounts,
      budgets: [],
      summary: createOnboardingSummary(available, {
        monthKey: financialSummary.monthKey,
        monthLabel: financialSummary.monthLabel,
      }),
      transactions: [],
    };
  }, [accounts]);

  return (
    <div className="app-viewport">
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <ViewerProvider viewer={viewer}>
        <PrototypeQueryProvider>
          <div className="app-shell">
            <MockFinanceProvider
              initialAccounts={initialFinance.accounts}
              initialBudgets={initialFinance.budgets}
              initialSummary={initialFinance.summary}
              initialTransactions={initialFinance.transactions}
              sessionKey={viewer.id}
            >
              <div className="app-content" id="main-content" tabIndex={-1}>
                {children}
              </div>
            </MockFinanceProvider>
            <BottomNavigation />
          </div>
        </PrototypeQueryProvider>
      </ViewerProvider>
    </div>
  );
}

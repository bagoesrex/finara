"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MockFinanceProvider } from "@/components/mock-finance-provider";
import { PrototypeQueryProvider } from "@/components/prototype-query-provider";
import type { PrototypeAccount, PrototypeUser } from "@/lib/auth";
import { createOnboardingSummary } from "@/lib/auth";
import {
  accounts as demoAccounts,
  budgets as demoBudgets,
  financialSummary,
  transactions as demoTransactions,
} from "@/lib/mock-data";
import { usePrototypeAuth } from "./prototype-auth-provider";

type ReadyPrivateAppProps = {
  account: PrototypeAccount;
  children: ReactNode;
  user: PrototypeUser;
};

function ReadyPrivateApp({
  account,
  children,
  user,
}: ReadyPrivateAppProps) {
  const initialFinance = useMemo(() => {
    if (user.kind === "demo") {
      return {
        accounts: demoAccounts.map((demoAccount) => ({ ...demoAccount })),
        budgets: demoBudgets,
        summary: financialSummary,
        transactions: demoTransactions,
      };
    }

    return {
      accounts: [
        {
          id: "account-primary",
          name: account.name,
          type: account.type,
          currentBalance: account.currentBalance,
        },
      ],
      budgets: [],
      summary: createOnboardingSummary(account.currentBalance, {
        monthKey: financialSummary.monthKey,
        monthLabel: financialSummary.monthLabel,
      }),
      transactions: [],
    };
  }, [account.currentBalance, account.name, account.type, user.kind]);

  return (
    <div className="app-viewport">
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <PrototypeQueryProvider>
        <div className="app-shell">
          <MockFinanceProvider
            initialAccounts={initialFinance.accounts}
            initialBudgets={initialFinance.budgets}
            initialSummary={initialFinance.summary}
            initialTransactions={initialFinance.transactions}
            sessionKey={user.id}
          >
            <div className="app-content" id="main-content" tabIndex={-1}>
              {children}
            </div>
          </MockFinanceProvider>
          <BottomNavigation />
        </div>
      </PrototypeQueryProvider>
    </div>
  );
}

export function PrototypePrivateApp({ children }: { children: ReactNode }) {
  const auth = usePrototypeAuth();
  const router = useRouter();
  const redirectTarget =
    auth.status === "signed-out"
      ? "/welcome"
      : auth.status === "needs-onboarding"
        ? "/onboarding"
        : null;

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (auth.status !== "ready") {
    return (
      <div className="route-status" role="status">
        <span aria-hidden="true" />
        Memeriksa sesi prototipe…
      </div>
    );
  }

  return (
    <ReadyPrivateApp account={auth.account} user={auth.user}>
      {children}
    </ReadyPrivateApp>
  );
}

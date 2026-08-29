import { QueryClient, dehydrate } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { PrivateApp } from "@/components/private-app";
import {
  financeQueryKeys,
  type HydratedTransactionData,
} from "@/lib/finance-query";
import { getPrivateAppState } from "@/server/auth/private-app";
import { getCurrentMonthKey } from "@/server/time/current-month";
import {
  getFinanceSnapshot,
  listTransactions,
} from "@/server/transactions/service";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const state = await getPrivateAppState();

  if (state.status === "signed-out") {
    redirect("/welcome");
  }

  if (state.status === "needs-onboarding") {
    redirect("/onboarding");
  }

  const monthKey = getCurrentMonthKey();
  const [snapshot, transactionPage] = await Promise.all([
    getFinanceSnapshot(state.viewer.id, monthKey),
    listTransactions(state.viewer.id, {
      cursor: undefined,
      limit: 20,
      month: undefined,
      search: undefined,
      type: undefined,
    }),
  ]);
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    financeQueryKeys.snapshot(state.viewer.id, monthKey),
    snapshot,
  );
  queryClient.setQueryData<HydratedTransactionData>(
    financeQueryKeys.transactionList(state.viewer.id, {}),
    { pages: [transactionPage], pageParams: [null] },
  );

  return (
    <PrivateApp
      dehydratedState={dehydrate(queryClient)}
      monthKey={monthKey}
      viewer={state.viewer}
    >
      {children}
    </PrivateApp>
  );
}

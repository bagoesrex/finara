import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BudgetDashboard } from "@/components/budget-dashboard";
import { financeQueryKeys } from "@/lib/finance-query";
import { getMonthKeyInTimeZone } from "@/lib/transactions";
import { getPrivateAppState } from "@/server/auth/private-app";
import { getBudgetOverview } from "@/server/budgets/service";

export const metadata: Metadata = { title: "Anggaran" };

export default async function BudgetPage() {
  const state = await getPrivateAppState();
  if (state.status === "signed-out") redirect("/welcome");
  if (state.status === "needs-onboarding") redirect("/onboarding");

  const monthKey = getMonthKeyInTimeZone(new Date());
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    financeQueryKeys.budgetOverview(state.viewer.id, monthKey),
    await getBudgetOverview(state.viewer.id, monthKey),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BudgetDashboard />
    </HydrationBoundary>
  );
}

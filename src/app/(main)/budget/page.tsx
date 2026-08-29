import type { Metadata } from "next";
import { BudgetDashboard } from "@/components/budget-dashboard";

export const metadata: Metadata = { title: "Anggaran" };

export default function BudgetPage() {
  return <BudgetDashboard />;
}

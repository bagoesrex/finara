import type { Metadata } from "next";
import { BudgetDashboard } from "@/components/budget-dashboard";
import { PageHeader } from "@/components/page-header";
import { financialSummary } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Anggaran" };

export default function BudgetPage() {
  return (
    <main className="page page-enter">
      <PageHeader
        eyebrow={financialSummary.monthLabel}
        title="Anggaran"
        description="Atur batas per kategori dan lihat pemakaiannya."
      />
      <BudgetDashboard />
    </main>
  );
}

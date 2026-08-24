import type { Metadata } from "next";
import { ActivitySearch } from "@/components/activity-search";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Aktivitas" };

export default function ActivityPage() {
  return (
    <main className="page page-enter">
      <PageHeader
        eyebrow="Agustus 2026"
        title="Aktivitas"
        description="Semua pemasukan dan pengeluaranmu."
      />
      <ActivitySearch />
    </main>
  );
}

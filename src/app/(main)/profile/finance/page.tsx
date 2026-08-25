import type { Metadata } from "next";
import { FinanceSettingsDashboard } from "@/components/finance-settings-dashboard";

export const metadata: Metadata = { title: "Akun & Kategori" };

export default function FinanceSettingsPage() {
  return <FinanceSettingsDashboard />;
}

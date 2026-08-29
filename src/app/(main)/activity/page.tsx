import type { Metadata } from "next";
import { ActivityDashboard } from "@/components/activity-search";

export const metadata: Metadata = { title: "Aktivitas" };

export default function ActivityPage() {
  return <ActivityDashboard />;
}

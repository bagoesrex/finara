import { HomeDashboard } from "@/components/home-dashboard";
import { financialSummary, transactions } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <HomeDashboard
      initialSummary={financialSummary}
      initialTransactions={transactions.slice(0, 4)}
    />
  );
}

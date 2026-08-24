import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MockFinanceProvider } from "@/components/mock-finance-provider";
import { financialSummary, transactions } from "@/lib/mock-data";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-viewport">
      <div className="app-shell">
        <div className="app-content">
          <MockFinanceProvider
            initialSummary={financialSummary}
            initialTransactions={transactions}
          >
            {children}
          </MockFinanceProvider>
        </div>
        <BottomNavigation />
      </div>
    </div>
  );
}

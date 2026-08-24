import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-viewport">
      <div className="app-shell">
        <div className="app-content">{children}</div>
        <BottomNavigation />
      </div>
    </div>
  );
}

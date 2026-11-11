import React from 'react';
import { Home, ReceiptText, PieChart, User } from 'lucide-react';

export type TabType = 'home' | 'activity' | 'budget' | 'profile';

export interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'activity', label: 'Aktivitas', icon: ReceiptText },
  { id: 'budget', label: 'Budget', icon: PieChart },
  { id: 'profile', label: 'Profil', icon: User },
] as const;

export interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  className?: string;
}

export function BottomNav({
  activeTab,
  onTabChange,
  className = '',
}: BottomNavProps) {
  return (
    <nav
      role="tablist"
      aria-label="Navigasi Utama"
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-[#12141D]/95 backdrop-blur-md border-t border-[#232738] px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-40 ${className}`}
    >
      <div className="grid grid-cols-4 gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              onClick={() => onTabChange(item.id)}
              className={`min-h-[48px] min-w-[44px] flex flex-col items-center justify-center rounded-xl py-1 px-1.5 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-semibold'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] border border-transparent font-normal'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="text-[11px] leading-tight mt-1 tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;

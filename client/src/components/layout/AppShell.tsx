import React from 'react';
import { Header, type HeaderProps } from './Header';
import { BottomNav, type TabType } from './BottomNav';

export interface AppShellProps {
  children: React.ReactNode;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  showHeader?: boolean;
  showNav?: boolean;
  headerProps?: HeaderProps;
  className?: string;
  contentClassName?: string;
}

export function AppShell({
  children,
  activeTab = 'home',
  onTabChange,
  showHeader = true,
  showNav = true,
  headerProps,
  className = '',
  contentClassName = '',
}: AppShellProps) {
  return (
    <div className={`min-h-screen w-full bg-[#090A0F] text-[#F8FAFC] flex justify-center ${className}`}>
      <div className="w-full max-w-[440px] min-h-screen relative flex flex-col border-x border-[#232738]/40 bg-[#090A0F]">
        {showHeader && <Header {...headerProps} />}

        <main
          className={`flex-1 w-full flex flex-col px-4 py-4 pt-safe ${
            showNav ? 'pb-24' : 'pb-safe'
          } ${contentClassName}`}
        >
          {children}
        </main>

        {showNav && onTabChange && (
          <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
        )}
      </div>
    </div>
  );
}

export default AppShell;

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface HeaderProps {
  title?: string;
  statusText?: string;
  showStatus?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export function Header({
  title = 'Finara',
  statusText = 'Online',
  showStatus = true,
  rightElement,
  className = '',
}: HeaderProps) {
  return (
    <header
      className={`h-14 min-h-[56px] w-full bg-[#12141D] border-b border-[#232738] px-4 flex items-center justify-between sticky top-0 z-30 ${className}`}
    >
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold tracking-tight text-[#F8FAFC]">
          {title}
        </h1>
      </div>

      <div>
        {rightElement ? (
          rightElement
        ) : showStatus ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A1D2B] border border-[#232738] text-xs font-medium text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{statusText}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default Header;

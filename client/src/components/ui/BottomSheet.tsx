import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  showCloseButton = true,
  className = '',
}: BottomSheetProps) {
  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while sheet is active
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bottom-sheet-title' : undefined}
      className="fixed inset-0 z-50 flex flex-col justify-end items-center bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[440px] bg-[#12141D] border-t border-x border-[#232738] rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom,0px))] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle (40px x 4px, rounded-full) */}
        <div className="pt-3 pb-1 flex justify-center items-center shrink-0">
          <div
            data-testid="bottom-sheet-handle"
            className="w-10 h-1 bg-[#33394B] rounded-full"
            aria-hidden="true"
          />
        </div>

        {/* Optional Header with title and close button */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#232738]/60 shrink-0">
            <div>
              {title && (
                <h2
                  id="bottom-sheet-title"
                  className="text-base font-semibold text-slate-100 tracking-tight"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-[#1A1D2B] transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Sheet Content */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export default BottomSheet;

import React from 'react';
import { X } from 'lucide-react';

export interface NumericInputProps {
  value: number; // exact integer IDR
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

/**
 * Formats a positive integer to thousands dot separated string (e.g. 50000 -> 50.000).
 */
export function formatIDR(value: number): string {
  if (!value || isNaN(value) || value <= 0) return '';
  // shortcut: max 15 digits (999T IDR), upgrade to BigInt if multi-trillionaire users join
  return Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function NumericInput({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  autoFocus = false,
  className = '',
  id,
  name,
}: NumericInputProps) {
  const displayValue = value > 0 ? formatIDR(value) : '';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control and navigation keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    // Strictly block non-digit characters (including -, +, ,, ., letters, symbols)
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Clearing input triggers 0
    if (raw === '') {
      onChange(0);
      return;
    }

    // Strip any non-digit character (negative signs, symbols, letters)
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly === '') {
      // Non-digits only were entered/pasted; keep previous value unchanged
      return;
    }

    // Cap at 15 digits to stay within Number.MAX_SAFE_INTEGER
    const safeDigits = digitsOnly.slice(0, 15);
    const parsed = parseInt(safeDigits, 10);

    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
  };

  const handleClear = () => {
    if (!disabled) {
      onChange(0);
    }
  };

  return (
    <div
      className={`relative flex items-center w-full h-[50px] bg-[#1A1D2B] border border-[#232738] rounded-xl px-3.5 gap-2.5 transition-all duration-150 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
    >
      {/* Integrated currency prefix */}
      <span
        className="text-slate-400 font-medium select-none text-base md:text-lg"
        aria-hidden="true"
      >
        Rp
      </span>

      {/* Strict numeric mobile input */}
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent text-slate-100 font-semibold text-base md:text-lg tabular-nums outline-none placeholder:text-slate-500 min-w-0"
      />

      {/* Quick clear button (appears only when value > 0) */}
      {value > 0 && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Hapus nominal"
          className="flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 active:scale-90 transition-all shrink-0 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default NumericInput;

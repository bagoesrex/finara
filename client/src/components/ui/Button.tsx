import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg' | 'sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 focus-visible:ring-emerald-500/50 shadow-xs',
  secondary:
    'bg-[#1A1D2B] border border-[#232738] text-slate-100 hover:bg-[#232738] focus-visible:ring-slate-500/30',
  ghost:
    'bg-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/40 focus-visible:ring-slate-500/30',
  danger:
    'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 focus-visible:ring-rose-500/30',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 min-h-[36px] px-3 text-xs gap-1.5',
  md: 'h-11 min-h-[44px] px-4 text-sm gap-2',
  lg: 'h-12 min-h-[48px] px-5 text-base gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center rounded-xl select-none font-medium transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none active:scale-100' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <>
          {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

export default Button;

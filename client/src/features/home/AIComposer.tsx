import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { financeApi, type ParsedTransactionDraft } from '../../api/finance';

export interface AIComposerProps {
  onDraftReady: (draft: ParsedTransactionDraft) => void;
  className?: string;
  placeholder?: string;
}

export function AIComposer({
  onDraftReady,
  className = '',
  placeholder = 'Makan siang 25rb atau Beli bensin 50rb...',
}: AIComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await financeApi.parseTransactionAI(cleanPrompt);
      if (response?.draft) {
        onDraftReady(response.draft);
        setPrompt('');
      } else {
        setError('Gagal memproses draf, silakan coba lagi');
      }
    } catch {
      // Keeps prompt intact on error so user doesn't lose their input
      setError('Gagal memproses draf, silakan coba lagi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center bg-[#1A1D2B] border border-[#232738] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all duration-150"
      >
        {/* Thin emerald loading progress indicator (2px) */}
        {isLoading && (
          <div
            data-testid="ai-loading-bar"
            className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500 animate-pulse z-10"
            aria-hidden="true"
          />
        )}

        {/* Text input (16px to prevent mobile Safari zoom) */}
        <input
          type="text"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent h-12 min-h-[48px] px-3.5 text-base text-slate-100 placeholder:text-slate-500 outline-none min-w-0"
          aria-label="Tulis transaksi alami"
        />

        {/* Submit button (min 44x44px touch target) */}
        <button
          type="submit"
          disabled={!prompt.trim() || isLoading}
          aria-label="Kirim draf transaksi"
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg mr-1 flex items-center justify-center text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
        </button>
      </form>

      {/* Concise error display */}
      {error && (
        <p className="mt-1.5 text-xs text-rose-400 px-1 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default AIComposer;

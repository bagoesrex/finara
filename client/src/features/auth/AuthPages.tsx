import React, { useState } from 'react';
import { useAuth } from './useAuth';

type AuthMode = 'login' | 'register';

export function AuthPages() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ name, email, password });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan. Coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F8FAFC] flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-[440px] mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#12141D] border border-[#232738] text-emerald-400 font-bold text-xl tracking-tight mb-2">
            F
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">Finara</h1>
          <p className="text-xs text-[#94A3B8]">Presisi Keuangan Pribadi</p>
        </div>

        {/* Auth Mode Toggle */}
        <div
          role="tablist"
          aria-label="Mode Otentikasi"
          className="flex p-1 bg-[#12141D] rounded-xl border border-[#232738]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => handleModeChange('login')}
            className={`flex-1 min-h-[44px] py-2 text-sm font-medium rounded-lg transition ${
              mode === 'login'
                ? 'bg-[#1A1D2B] text-emerald-400 border border-[#232738]/60 shadow-xs'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => handleModeChange('register')}
            className={`flex-1 min-h-[44px] py-2 text-sm font-medium rounded-lg transition ${
              mode === 'register'
                ? 'bg-[#1A1D2B] text-emerald-400 border border-[#232738]/60 shadow-xs'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Daftar
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div
            role="alert"
            className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl"
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-xs font-medium text-[#94A3B8] mb-1.5"
              >
                Nama Lengkap
              </label>
              <input
                id="auth-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Nama lengkap"
                className="w-full h-12 px-4 rounded-xl bg-[#1A1D2B] border border-[#232738] text-base text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-[#94A3B8] mb-1.5"
            >
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="nama@email.com"
              className="w-full h-12 px-4 rounded-xl bg-[#1A1D2B] border border-[#232738] text-base text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-[#94A3B8] mb-1.5"
            >
              Kata Sandi
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder={mode === 'register' ? 'Minimal 8 karakter' : 'Kata sandi'}
              className="w-full h-12 px-4 rounded-xl bg-[#1A1D2B] border border-[#232738] text-base text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 min-h-[48px] mt-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>
      </div>
    </div>
  );
}

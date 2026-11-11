import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { AppShell, type TabType } from './components/layout';
import { useAuth } from './features/auth/useAuth';
import { AuthPages } from './features/auth/AuthPages';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const { user, logout } = useAuth();

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'home' && (
        <section className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#12141D] border border-[#232738]">
            <p className="text-xs uppercase tracking-wider text-[#94A3B8]">Total Saldo</p>
            <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-[#F8FAFC]">
              Rp 0
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-[#1A1D2B] border border-[#232738]/60 flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-[10px] text-[#94A3B8] block">Pemasukan</span>
                  <span className="text-xs font-semibold tabular-nums text-[#F8FAFC]">Rp 0</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#1A1D2B] border border-[#232738]/60 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-[10px] text-[#94A3B8] block">Pengeluaran</span>
                  <span className="text-xs font-semibold tabular-nums text-[#F8FAFC]">Rp 0</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'activity' && (
        <section className="p-4 rounded-2xl bg-[#12141D] border border-[#232738]">
          <h2 className="text-sm font-semibold text-[#F8FAFC]">Aktivitas Transaksi</h2>
          <p className="mt-2 text-xs text-[#94A3B8]">Belum ada riwayat transaksi.</p>
        </section>
      )}

      {activeTab === 'budget' && (
        <section className="p-4 rounded-2xl bg-[#12141D] border border-[#232738]">
          <h2 className="text-sm font-semibold text-[#F8FAFC]">Budget Bulanan</h2>
          <p className="mt-2 text-xs text-[#94A3B8]">Belum ada alokasi budget.</p>
        </section>
      )}

      {activeTab === 'profile' && (
        <section className="p-4 rounded-2xl bg-[#12141D] border border-[#232738] space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Profil Pengguna</h2>
            {user ? (
              <div className="mt-2 text-xs text-[#94A3B8] space-y-0.5">
                <p className="text-sm font-medium text-[#F8FAFC]">{user.name}</p>
                <p>{user.email}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#94A3B8]">Finara Mobile v0.1.0</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full h-11 min-h-[44px] rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition active:scale-[0.98] cursor-pointer"
          >
            Keluar
          </button>
        </section>
      )}
    </AppShell>
  );
}

export function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090A0F] flex items-center justify-center text-[#94A3B8] text-sm">
        Memuat...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPages />;
  }

  return <AppContent />;
}

export default App;

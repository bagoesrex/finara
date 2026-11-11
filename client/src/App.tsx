import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { AppShell, type TabType } from './components/layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

export function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('home');

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
        <section className="p-4 rounded-2xl bg-[#12141D] border border-[#232738]">
          <h2 className="text-sm font-semibold text-[#F8FAFC]">Profil Pengguna</h2>
          <p className="mt-2 text-xs text-[#94A3B8]">Finara Mobile v0.1.0</p>
        </section>
      )}
    </AppShell>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;

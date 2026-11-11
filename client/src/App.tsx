import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-[#090A0F] text-[#F8FAFC] flex justify-center">
        <div className="w-full max-w-[440px] min-h-screen flex flex-col p-4 border-x border-[#232738]/50">
          <header className="py-4 border-b border-[#232738] flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">Finara</h1>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              Online
            </span>
          </header>

          <section className="mt-6 p-4 rounded-2xl bg-[#12141D] border border-[#232738]">
            <p className="text-xs uppercase tracking-wider text-[#94A3B8]">Total Saldo</p>
            <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-[#F8FAFC]">
              Rp 0
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-[#1A1D2B] border border-[#232738]/60 flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-[10px] text-[#94A3B8] block">Pemasukan</span>
                  <span className="text-xs font-semibold tabular-nums text-[#F8FAFC]">Rp 0</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#1A1D2B] border border-[#232738]/60 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
                <div>
                  <span className="text-[10px] text-[#94A3B8] block">Pengeluaran</span>
                  <span className="text-xs font-semibold tabular-nums text-[#F8FAFC]">Rp 0</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </QueryClientProvider>
  );
}

export default App;

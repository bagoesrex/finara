import { useState } from 'react';
import { AppShell, type TabType } from './components/layout';
import { useAuth } from './features/auth/useAuth';
import { AuthPages } from './features/auth/AuthPages';
import { HomeDashboard } from './features/home';
import { ActivityPage } from './features/activity';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const { user, logout } = useAuth();

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'home' && <HomeDashboard />}

      {activeTab === 'activity' && <ActivityPage />}

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

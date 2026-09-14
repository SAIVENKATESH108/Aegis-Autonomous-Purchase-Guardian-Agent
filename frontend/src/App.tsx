import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { DemoBanner } from './components/DemoBanner';
import { Dashboard } from './components/Dashboard';
import { AlertFeed } from './components/AlertFeed';
import { LiveRecallRadar } from './components/LiveRecallRadar';
import { AddItemModal } from './components/AddItemModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { NotificationHubModal } from './components/NotificationHubModal';
import { ToastContainer } from './components/ToastContainer';
import { useGuardianStore } from './store/useGuardianStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
      retry: 1,
    },
  },
});

function MainApp() {
  const { activeTab } = useGuardianStore();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-navy-800">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Top Intelligence Stats */}
        <StatsBar />

        {/* Hackathon Reviewer 1-Click Banner */}
        <DemoBanner />

        {/* Main Workspace Views */}
        <div className="mt-6">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'alerts' && <AlertFeed />}
          {activeTab === 'radar' && <LiveRecallRadar />}
        </div>
      </main>

      {/* Global Modals, Floating Guide & Toasts */}
      <AddItemModal />
      <ItemDetailModal />
      <ArchitectureModal />
      <NotificationHubModal />
      <ToastContainer />


      {/* Footer */}
      <footer className="mt-auto border-t border-border/80 bg-surface/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-navy-600">
          <div className="flex items-center gap-2.5">
            <img
              src="/aegis-logo.png"
              alt="Aegis Logo"
              className="w-6 h-6 rounded-full object-cover border border-emerald-500/30"
            />
            <span className="font-bold text-navy-800">Aegis Guardian</span>
            <span>•</span>
            <span>Powered by Strands Agents SDK & Amazon Bedrock</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>CPSC Recall API Integration</span>
            <span>•</span>
            <span>Min-Heap Priority Queue</span>
            <span>•</span>
            <span>SQLite via SQLAlchemy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

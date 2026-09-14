import React from 'react';
import { Plus, Cpu } from 'lucide-react';
import { useGuardianStore } from '../store/useGuardianStore';
import { useAlerts, useStats } from '../api/client';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsAddModalOpen,
    setIsArchitectureModalOpen,
    setIsNotificationHubOpen
  } = useGuardianStore();

  const { data: alerts = [] } = useAlerts('pending');
  const { data: stats } = useStats();

  const isBedrock = stats?.bedrock_status?.is_live_bedrock;

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <img
              src="/aegis-logo.png"
              alt="Aegis Logo"
              className="w-10 h-10 rounded-full object-cover shadow-sm border border-emerald-500/30 ring-2 ring-emerald-500/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-navy-900">Aegis</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Strands Agent Core
                </span>
              </div>
              <p className="text-xs text-navy-600 hidden sm:block">
                Autonomous Purchase Guardian & Recall Shield
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-subtle p-1 rounded-xl border border-border/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600 hover:text-navy-900'
              }`}
            >
              📦 Guardian Feed
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'alerts'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600 hover:text-navy-900'
              }`}
            >
              <span>🚨 Escalations</span>
              {alerts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-recall-accent text-white animate-pulse">
                  {alerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('radar')}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'radar'
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-navy-600 hover:text-navy-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>📡 Federal Radar</span>
            </button>
          </nav>

          {/* Right Actions: Bedrock Live Indicator, Architecture & Add Purchase */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Architecture Modal Button */}
            <button
              onClick={() => setIsArchitectureModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-subtle hover:bg-white text-xs font-semibold text-navy-700 hover:text-navy-950 transition-all cursor-pointer shadow-xs"
              title="View Strands Agent Architecture & Design Patterns Diagram"
            >
              <Cpu className="w-3.5 h-3.5 text-navy-600" />
              <span className="hidden md:inline">Architecture</span>
            </button>

            {/* Notification Hub Trigger */}
            <button
              onClick={() => setIsNotificationHubOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-subtle hover:bg-white text-xs font-semibold text-navy-700 hover:text-navy-950 transition-all cursor-pointer shadow-xs"
              title="Observer Pattern Broadcast Stream (Telegram & In-App Feed)"
            >
              <span className="text-xs">📡</span>
              <span className="hidden lg:inline">Observer Stream</span>
            </button>


            {/* Strands Bedrock indicator pill */}
            <div 
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] text-navy-600"
              title={isBedrock ? "Connected to Amazon Bedrock Claude 3 Haiku" : "Operating in Strands Autonomous Local Heuristic Mode"}
            >
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-medium">
                {isBedrock ? "Bedrock Claude" : "Strands Agent"}
              </span>
            </div>

            {/* Add Receipt Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Track Receipt</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

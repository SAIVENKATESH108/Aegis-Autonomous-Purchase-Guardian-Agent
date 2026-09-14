import React from 'react';
import { Sparkles, RotateCcw, Info, Clock } from 'lucide-react';
import { useSeedDemo, useResetDemo, useSimulateExpiry } from '../api/client';
import { useGuardianStore } from '../store/useGuardianStore';

export const DemoBanner: React.FC = () => {
  const seedMutation = useSeedDemo();
  const resetMutation = useResetDemo();
  const simulateMutation = useSimulateExpiry();
  const { addToast, setActiveTab } = useGuardianStore();

  const handleSeed = () => {
    seedMutation.mutate(undefined, {
      onSuccess: () => {
        addToast({
          title: 'Demo Receipts Loaded',
          message: 'Loaded 4 samples: 2 routine (silent), 1 CPSC safety recall, and 1 closing return deadline.',
          type: 'success',
        });
      },
      onError: (err: any) => {
        addToast({
          title: 'Seed Error',
          message: err.message || 'Could not load demo receipts',
          type: 'urgent',
        });
      },
    });
  };

  const handleSimulate = () => {
    simulateMutation.mutate(undefined, {
      onSuccess: (res: any) => {
        addToast({
          title: '⚡ Day 28 Reached (Simulated)',
          message: res.message || 'Return window now closing in 2 days. Escalation generated!',
          type: 'urgent',
        });
        setActiveTab('alerts');
      },
      onError: (err: any) => {
        addToast({
          title: 'Simulation Error',
          message: err.message || 'Failed to fast forward item deadline',
          type: 'urgent',
        });
      },
    });
  };

  const handleReset = () => {
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        addToast({
          title: 'Database Reset',
          message: 'All purchases and escalations cleared.',
          type: 'info',
        });
      },
    });
  };


  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 mb-8 text-white shadow-elevated border border-navy-700/60 bg-navy-950">
      {/* Background Banner Image with subtle gradient overlay */}
      <div 
        className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none mix-blend-luminosity"
        style={{ backgroundImage: `url('/aegis-banner.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-navy-900/80 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        
        {/* Pitch & Contrast Explanation with Logo */}
        <div className="flex items-start gap-4 max-w-2xl">
          <img
            src="/aegis-logo.png"
            alt="Aegis Guardian"
            className="w-14 h-14 rounded-full object-cover shadow-lg border-2 border-emerald-400/40 shrink-0 hidden sm:block ring-4 ring-emerald-500/10"
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                Hackathon Evaluation Mode
              </span>
              <span className="text-xs text-navy-300 flex items-center gap-1 font-medium">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                "Silent Tracking vs. Actionable Escalation"
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
              Aegis surfaces decisions <span className="text-emerald-400">only</span> when human action is strictly required.
            </h2>
            <p className="text-xs text-navy-200 leading-relaxed">
              Routine items stay 100% silent in the background. If a return window is closing or a tracked product matches an official CPSC safety recall, Aegis generates a pre-drafted claim message for 1-click approval.
            </p>
          </div>
        </div>

        {/* 1-Click Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleSeed}
            disabled={seedMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-navy-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-navy-950" />
            <span>{seedMutation.isPending ? 'Ingesting Sample Receipts...' : '🚀 1-Click Demo Seed'}</span>
          </button>

          <button
            onClick={handleSimulate}
            disabled={simulateMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 hover:text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            title="Fast forward return window to Day 28 to simulate closing return window"
          >
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>{simulateMutation.isPending ? 'Simulating...' : '⚡ Day 28 Warning'}</span>
          </button>

          <button
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-navy-800/80 hover:bg-navy-700 border border-navy-600/60 text-navy-100 hover:text-white text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
            title="Clear all records"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

        </div>

      </div>
    </div>
  );
};

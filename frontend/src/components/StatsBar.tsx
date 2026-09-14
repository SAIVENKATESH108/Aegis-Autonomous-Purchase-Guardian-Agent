import React from 'react';
import { DollarSign } from 'lucide-react';
import { useStats } from '../api/client';

export const StatsBar: React.FC = () => {
  const { data: stats } = useStats();

  const totalItems = stats?.total_items_monitored || 0;
  const totalValue = stats?.total_protected_value || 0;
  const pendingAlerts = stats?.active_alerts_count || 0;
  const recallsCount = stats?.recalls_detected_count || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Total Purchases Monitored */}
      <div className="bg-surface rounded-2xl p-4 border border-border shadow-soft flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-700">
          <span className="text-xl">📦</span>
        </div>
        <div>
          <div className="text-xs font-medium text-navy-600">Active Purchases</div>
          <div className="text-2xl font-bold tracking-tight text-navy-900">{totalItems}</div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Silent triage running
          </div>
        </div>
      </div>

      {/* 2. Total Protected Value */}
      <div className="bg-surface rounded-2xl p-4 border border-border shadow-soft flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
          <DollarSign className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <div className="text-xs font-medium text-navy-600">Guarded Value</div>
          <div className="text-2xl font-bold tracking-tight text-navy-900">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-navy-600">Return & warranty capital</div>
        </div>
      </div>

      {/* 3. Imminent Deadlines */}
      <div className="bg-surface rounded-2xl p-4 border border-border shadow-soft flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
          <span className="text-xl">⏰</span>
        </div>
        <div>
          <div className="text-xs font-medium text-navy-600">Actionable Deadlines</div>
          <div className="text-2xl font-bold tracking-tight text-navy-900">{pendingAlerts}</div>
          <div className="text-[11px] text-navy-600 truncate max-w-[170px]">
            {stats?.nearest_deadline_item ? `Soonest: ${stats.nearest_deadline_item}` : 'All deadlines healthy'}
          </div>
        </div>
      </div>

      {/* 4. Active Safety Recalls */}
      <div className={`rounded-2xl p-4 border shadow-soft flex items-center gap-3.5 transition-all ${
        recallsCount > 0
          ? 'bg-recall-light border-recall-border shadow-urgent'
          : 'bg-surface border-border'
      }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          recallsCount > 0
            ? 'bg-recall-badge border border-recall-border text-recall-accent'
            : 'bg-navy-50 border border-navy-100 text-navy-700'
        }`}>
          <span className="text-xl">🚨</span>
        </div>
        <div>
          <div className="text-xs font-medium text-navy-600">CPSC Recall Hits</div>
          <div className={`text-2xl font-bold tracking-tight ${
            recallsCount > 0 ? 'text-recall-text' : 'text-navy-900'
          }`}>
            {recallsCount}
          </div>
          <div className={`text-[11px] font-semibold ${
            recallsCount > 0 ? 'text-recall-accent' : 'text-emerald-600'
          }`}>
            {recallsCount > 0 ? 'Urgent claim ready for approval' : 'Federal recall check clean'}
          </div>
        </div>
      </div>

    </div>
  );
};

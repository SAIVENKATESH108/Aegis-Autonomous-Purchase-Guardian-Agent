import { useState } from 'react';
import { Search, ShieldAlert, ExternalLink, ShieldCheck, Sparkles, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { useLiveRecallSearch, useProtectRecall } from '../api/client';

import { useGuardianStore } from '../store/useGuardianStore';
import type { LiveRecallResult } from '../types';

const POPULAR_SEARCHES = [
  'Heater', 'Charger', 'Peloton', 'Bicycle', 'Stroller', 'Ember', 'Battery', 'Generator', 'Helmet', 'Toy'
];

export const LiveRecallRadar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('Heater');
  const [activeQuery, setActiveQuery] = useState('Heater');
  const { data: recallResults = [], isLoading, isFetching } = useLiveRecallSearch(activeQuery);
  const protectMutation = useProtectRecall();
  const { addToast, setActiveTab } = useGuardianStore();
  const [protectedIds, setProtectedIds] = useState<Set<string>>(new Set());

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setActiveQuery(searchTerm.trim());
    }
  };

  const handleQuickPill = (term: string) => {
    setSearchTerm(term);
    setActiveQuery(term);
  };

  const handleShieldProduct = (recall: LiveRecallResult) => {
    protectMutation.mutate(
      {
        title: recall.title,
        recall_id: recall.recall_id,
        hazard: recall.hazard,
        remedy: recall.remedy,
        consumer_contact: recall.consumer_contact,
        merchant: 'Federal Recall Registry',
        price: 79.99,
        model_number: recall.products?.[0] || undefined
      },
      {
        onSuccess: () => {
          setProtectedIds(prev => new Set(prev).add(recall.recall_id));
          addToast({
            title: 'Product Shielded in Aegis',
            message: `Created purchase record & generated official CPSC claim draft for Recall #${recall.recall_id}.`,
            type: 'urgent'
          });
          setActiveTab('alerts');
        },
        onError: (err: any) => {
          addToast({
            title: 'Shielding Failed',
            message: err.message || 'Could not import recalled product',
            type: 'urgent'
          });
        }
      }
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header & Explanation */}
      <div className="bg-surface rounded-3xl p-6 border border-border shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📡</span>
              <h2 className="text-lg font-bold text-navy-900 tracking-tight">
                Federal Recall Radar — Live CPSC Database
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                saferproducts.gov LIVE
              </span>
            </div>
            <p className="text-xs text-navy-600 max-w-2xl leading-relaxed">
              Search real-world federal consumer safety recall announcements directly from the U.S. Consumer Product Safety Commission API.
              Shield any product to immediately simulate autonomous recall protection and pre-drafted claim generation.
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-navy-800">
              {recallResults.length} Federal Matches
            </div>
            <div className="text-[11px] text-navy-600 font-mono">
              Query: "{activeQuery}"
            </div>
          </div>
        </div>

        {/* Live Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-600" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search live CPSC database by product name (e.g. Peloton, Charger, Heater, Bicycle, Ember, Toy)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-white text-xs text-navy-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isFetching}
            className="px-5 py-2.5 rounded-2xl bg-navy-900 hover:bg-navy-800 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            {(isLoading || isFetching) ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Querying CPSC...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Scan Registry</span>
              </>
            )}
          </button>
        </form>

        {/* Popular Search Pills */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-navy-600 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" /> Quick Scans:
          </span>
          {POPULAR_SEARCHES.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handleQuickPill(term)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeQuery.toLowerCase() === term.toLowerCase()
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-subtle text-navy-700 hover:bg-white hover:border-emerald-300 border border-border'
              }`}
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      {isLoading ? (
        <div className="bg-surface rounded-3xl p-12 text-center border border-border shadow-soft">
          <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <div className="text-sm font-bold text-navy-900">Querying U.S. CPSC REST Web Services...</div>
          <div className="text-xs text-navy-600 mt-1">Retrieving official hazard reports, remedy specifications, and recall numbers</div>
        </div>
      ) : recallResults.length === 0 ? (
        <div className="bg-surface rounded-3xl p-12 text-center border border-dashed border-border shadow-soft">
          <span className="text-3xl mb-2 inline-block">🛡️</span>
          <h3 className="text-sm font-bold text-navy-900">No Recalls Found for "{activeQuery}"</h3>
          <p className="text-xs text-navy-600 max-w-sm mx-auto mt-1">
            Try searching for terms like <code className="font-mono">Heater</code>, <code className="font-mono">Peloton</code>, <code className="font-mono">Charger</code>, or <code className="font-mono">Toy</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recallResults.map((recall) => {
            const isShielded = protectedIds.has(recall.recall_id);

            return (
              <div
                key={recall.recall_id}
                className="bg-surface rounded-3xl p-5 border border-recall-border bg-recall-light/20 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Recall ID & Date */}
                  <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-border/60">
                    <span className="text-[11px] font-mono font-extrabold text-recall-text bg-recall-badge px-2 py-0.5 rounded-md border border-recall-border">
                      CPSC #{recall.recall_id}
                    </span>
                    <span className="text-[11px] text-navy-600 font-medium">
                      {recall.date ? new Date(recall.date).toLocaleDateString() : 'Official Notice'}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-navy-950 leading-snug mb-2">
                    {recall.title}
                  </h4>

                  {/* Hazard & Remedy Badges */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-1.5 text-xs text-recall-text font-medium bg-recall-light p-2.5 rounded-xl border border-recall-border">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-recall-accent mt-0.5" />
                      <div>
                        <span className="font-bold">Hazard: </span>
                        <span>{recall.hazard}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-xs text-emerald-900 font-medium bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      <div>
                        <span className="font-bold">Remedy: </span>
                        <span>{recall.remedy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description snippet */}
                  {recall.description && (
                    <p className="text-xs text-navy-600 line-clamp-3 leading-relaxed mb-3">
                      {recall.description}
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <a
                    href={recall.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-navy-700 hover:text-navy-950 hover:underline"
                  >
                    <span>Official CPSC Notice</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => handleShieldProduct(recall)}
                    disabled={protectMutation.isPending || isShielded}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer ${
                      isShielded
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                        : 'bg-recall-accent hover:bg-recall-text text-white'
                    }`}
                  >
                    {isShielded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Shielded in Aegis</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Shield This Product</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

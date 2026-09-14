import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useGuardianStore } from '../store/useGuardianStore';

export const ItemDetailModal: React.FC = () => {
  const { selectedItem, setSelectedItem, setActiveTab } = useGuardianStore();

  if (!selectedItem) return null;

  const hasRecall = selectedItem.has_active_recall;
  const isExpiring = selectedItem.is_return_closing_soon;

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl max-w-xl w-full border border-border shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-subtle/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
              hasRecall
                ? 'bg-recall-badge text-recall-accent border border-recall-border'
                : 'bg-navy-50 text-navy-700 border border-border'
            }`}>
              {hasRecall ? '🚨' : '📦'}
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900 leading-snug">
                {selectedItem.name}
              </h3>
              <div className="text-xs text-navy-600 flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-navy-800">{selectedItem.merchant}</span>
                <span>•</span>
                <span className="font-mono">{selectedItem.category}</span>
                {selectedItem.model_number && (
                  <>
                    <span>•</span>
                    <span className="font-mono">Model: {selectedItem.model_number}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedItem(null)}
            className="p-1.5 rounded-lg text-navy-600 hover:text-navy-900 hover:bg-subtle transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-subtle p-3 rounded-xl border border-border">
              <div className="text-[10px] uppercase font-semibold text-navy-600">Price Paid</div>
              <div className="text-base font-bold text-navy-900">
                ${selectedItem.price.toFixed(2)} {selectedItem.currency}
              </div>
            </div>

            <div className="bg-subtle p-3 rounded-xl border border-border">
              <div className="text-[10px] uppercase font-semibold text-navy-600">Purchase Date</div>
              <div className="text-xs font-bold text-navy-900 mt-1">
                {new Date(selectedItem.purchase_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div className="bg-subtle p-3 rounded-xl border border-border">
              <div className="text-[10px] uppercase font-semibold text-navy-600">Return Window</div>
              <div className={`text-xs font-bold mt-1 ${isExpiring ? 'text-amber-700' : 'text-navy-900'}`}>
                {selectedItem.days_left_return > 0
                  ? `${selectedItem.days_left_return}d remaining`
                  : 'Window closed'}
              </div>
            </div>
          </div>

          {/* CPSC Safety Recall Audit Status */}
          <div className={`rounded-xl p-4 border ${
            hasRecall
              ? 'bg-recall-light border-recall-border'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 mt-0.5">
                {hasRecall ? (
                  <span className="text-xl">🚨</span>
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-navy-900">
                    CPSC Product Safety Status:
                  </span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.2 rounded-full ${
                    hasRecall
                      ? 'bg-recall-badge text-recall-text'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {hasRecall ? 'ACTION REQUIRED' : 'CLEAN BILL OF HEALTH'}
                  </span>
                </div>
                <p className="text-xs text-navy-700 leading-relaxed">
                  {hasRecall
                    ? 'This product matches an official consumer safety recall announcement in the CPSC database. A pre-drafted remedy claim is ready in your Escalations feed.'
                    : 'Scanned against the official U.S. Consumer Product Safety Commission (CPSC) Recall registry. No hazardous recalls reported for this model.'}
                </p>
                {hasRecall && (
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setActiveTab('alerts');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-recall-accent hover:underline mt-1 cursor-pointer"
                  >
                    View Pre-Drafted Claim in Escalations →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Timeline & Deadlines */}
          <div className="bg-white rounded-xl p-4 border border-border space-y-2.5">
            <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wide">
              Guardian Lifecycle Deadlines
            </h4>
            
            <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
              <span className="text-navy-600">Return Policy Window:</span>
              <span className="font-semibold text-navy-900">
                {selectedItem.return_window_days} Days ({new Date(selectedItem.return_deadline).toLocaleDateString()})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-navy-600">Manufacturer Warranty:</span>
              <span className="font-semibold text-navy-900">
                {selectedItem.warranty_days} Days ({new Date(selectedItem.warranty_deadline).toLocaleDateString()})
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-subtle/50 flex justify-end shrink-0">
          <button
            onClick={() => setSelectedItem(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-navy-800 bg-white border border-border hover:bg-subtle transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

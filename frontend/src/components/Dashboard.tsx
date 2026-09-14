import { ChevronRight, CheckCircle2, Search, Download } from 'lucide-react';
import { useItems } from '../api/client';
import { useGuardianStore } from '../store/useGuardianStore';

export const Dashboard: React.FC = () => {
  const { data: items = [], isLoading } = useItems();
  const {
    setSelectedItem,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    addToast
  } = useGuardianStore();

  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = ["ID", "Item Name", "Merchant", "Price", "Purchase Date", "Return Window Days", "Warranty Days", "Status", "Has Active Recall"];
    const rows = items.map(it => [
      it.id,
      `"${it.name.replace(/"/g, '""')}"`,
      `"${it.merchant.replace(/"/g, '""')}"`,
      it.price,
      it.purchase_date,
      it.return_window_days,
      it.warranty_days,
      it.status,
      it.has_active_recall ? "YES" : "NO"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aegis_purchases_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      title: "Export Complete",
      message: "Purchase protection report exported to CSV.",
      type: "success"
    });
  };

  // Filter items based on search and status
  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.merchant.toLowerCase().includes(query) ||
      (item.model_number && item.model_number.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterStatus === 'urgent') {
      return item.has_active_recall || item.is_return_closing_soon;
    }
    if (filterStatus === 'routine') {
      return !item.has_active_recall && !item.is_return_closing_soon && item.status === 'active';
    }
    if (filterStatus === 'resolved') {
      return item.status === 'returned' || item.status === 'claimed';
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl p-12 text-center border border-border">
        <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-sm font-semibold text-navy-800">Querying Min-Heap Priority Queue...</div>
        <div className="text-xs text-navy-600">Ordering items by nearest return and warranty deadline</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-surface rounded-2xl p-12 text-center border border-dashed border-border shadow-soft">
        <div className="w-16 h-16 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center mx-auto mb-4 text-3xl">
          📦
        </div>
        <h3 className="text-base font-bold text-navy-900 mb-1">No Purchases Monitored Yet</h3>
        <p className="text-xs text-navy-600 max-w-md mx-auto mb-6">
          Add your first purchase receipt above, or click the <span className="font-semibold text-emerald-700">1-Click Demo Seed</span> banner to populate 4 sample receipts demonstrating silent tracking and safety recall triggers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      
      {/* Header, Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border/70">
        <div>
          <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <span>Priority Deadline Queue</span>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-navy-50 text-navy-600 border border-border">
              Backed by Python Min-Heap O(log n)
            </span>
          </h3>
          <p className="text-xs text-navy-600">
            Sorted dynamically by most urgent deadline first.
          </p>
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-navy-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search purchases..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-white text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 w-44 sm:w-56"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white hover:bg-subtle text-xs font-semibold text-navy-700 transition-all cursor-pointer shadow-xs"
            title="Download CSV Dossier"
          >
            <Download className="w-3.5 h-3.5 text-navy-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'bg-white border border-border text-navy-600 hover:text-navy-900'
          }`}
        >
          All ({items.length})
        </button>
        <button
          onClick={() => setFilterStatus('urgent')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            filterStatus === 'urgent'
              ? 'bg-recall-accent text-white shadow-xs'
              : 'bg-white border border-border text-navy-600 hover:text-navy-900'
          }`}
        >
          <span>🚨 Action Required</span>
          <span>({items.filter(i => i.has_active_recall || i.is_return_closing_soon).length})</span>
        </button>
        <button
          onClick={() => setFilterStatus('routine')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            filterStatus === 'routine'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white border border-border text-navy-600 hover:text-navy-900'
          }`}
        >
          <span>✅ Silent & Safe</span>
          <span>({items.filter(i => !i.has_active_recall && !i.is_return_closing_soon && i.status === 'active').length})</span>
        </button>
        <button
          onClick={() => setFilterStatus('resolved')}
          className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
            filterStatus === 'resolved'
              ? 'bg-navy-700 text-white shadow-xs'
              : 'bg-white border border-border text-navy-600 hover:text-navy-900'
          }`}
        >
          Resolved ({items.filter(i => i.status === 'returned' || i.status === 'claimed').length})
        </button>
      </div>

      {/* Items List Cards */}
      {filteredItems.length === 0 ? (
        <div className="bg-surface rounded-2xl p-8 text-center border border-dashed border-border">
          <p className="text-xs text-navy-600">No purchases match your filter query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => {
          const isExpiring = item.is_return_closing_soon && item.status === 'active';
          const hasRecall = item.has_active_recall;
          const returnProgress = Math.min(
            100,
            Math.max(0, ((item.return_window_days - item.days_left_return) / item.return_window_days) * 100)
          );

          return (
            <div
              key={item.id}
              className={`bg-surface rounded-2xl p-4 sm:p-5 border transition-all hover:shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                hasRecall
                  ? 'border-recall-border bg-recall-light/30 shadow-urgent'
                  : isExpiring
                  ? 'border-amber-300 bg-amber-50/30'
                  : 'border-border'
              }`}
              onClick={() => setSelectedItem(item)}
            >
              {/* Left Column: Product & Merchant Info */}
              <div className="flex items-start gap-3.5 min-w-[280px]">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl ${
                  hasRecall
                    ? 'bg-recall-badge text-recall-accent border border-recall-border'
                    : isExpiring
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-subtle text-navy-700 border border-border'
                }`}>
                  {hasRecall ? '🚨' : isExpiring ? '⏰' : '📦'}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-navy-900 leading-snug">
                      {item.name}
                    </h4>
                    {item.model_number && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-subtle text-navy-600">
                        {item.model_number}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-navy-600 mt-1">
                    <span className="font-semibold text-navy-700">{item.merchant}</span>
                    <span>•</span>
                    <span className="font-medium text-emerald-700">
                      ${item.price.toFixed(2)} {item.currency}
                    </span>
                    <span>•</span>
                    <span>{new Date(item.purchase_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Middle Column: Deadlines & Health Bar */}
              <div className="flex flex-col gap-1.5 min-w-[220px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-navy-600 font-medium">Return Window:</span>
                  <span className={`font-bold ${
                    isExpiring ? 'text-amber-700' : 'text-navy-800'
                  }`}>
                    {item.days_left_return > 0
                      ? `${item.days_left_return} days remaining`
                      : 'Expired'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-subtle rounded-full h-1.5 overflow-hidden border border-border/50">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isExpiring
                        ? 'bg-amber-500'
                        : hasRecall
                        ? 'bg-recall-accent'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${returnProgress}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-navy-600">
                  <span>Policy: {item.return_window_days}d</span>
                  <span>Warranty: {item.warranty_days}d</span>
                </div>
              </div>

              {/* Right Column: Status Badges & Action Trigger */}
              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                
                {hasRecall ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('alerts');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-recall-badge border border-recall-border text-recall-accent text-xs font-bold hover:bg-recall-border transition-all cursor-pointer"
                  >
                    <span>🚨 Recall Match</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : isExpiring ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('alerts');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-200 transition-all cursor-pointer"
                  >
                    <span>⏰ Closing Soon</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : item.status === 'returned' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-subtle text-navy-600 text-xs font-medium">
                    ✅ Return Approved
                  </span>
                ) : item.status === 'claimed' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    ✅ Claim Approved
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Silent & Clear</span>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="p-1.5 text-navy-600 hover:text-navy-900 hover:bg-subtle rounded-lg transition-all"
                  title="View Purchase Audit & Timeline"
                >
                  <ChevronRight className="w-4 h-4" />
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

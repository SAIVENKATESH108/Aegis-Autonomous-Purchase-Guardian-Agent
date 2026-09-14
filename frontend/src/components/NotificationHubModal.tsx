import { useState } from 'react';
import { X, Send, Bell, Check, Copy } from 'lucide-react';
import { useGuardianStore } from '../store/useGuardianStore';
import { useEvents } from '../api/client';

export const NotificationHubModal: React.FC = () => {
  const { isNotificationHubOpen, setIsNotificationHubOpen, addToast } = useGuardianStore();
  const { data: eventsData } = useEvents();
  const [activeChannel, setActiveChannel] = useState<'telegram' | 'inapp'>('telegram');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isNotificationHubOpen) return null;

  const inAppEvents = eventsData?.in_app_events || [];
  const telegramDispatches = eventsData?.telegram_dispatches || [];
  const observerCount = eventsData?.active_observers_count || 2;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
    addToast({
      title: 'Telegram Alert Copied',
      message: 'Formatted markdown message copied to clipboard.',
      type: 'info',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-surface rounded-3xl max-w-3xl w-full border border-border shadow-elevated overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-subtle/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center text-lg">
              📡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-navy-900 tracking-tight">
                  Observer Pattern Notification Hub
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {observerCount} Active Observers
                </span>
              </div>
              <p className="text-xs text-navy-600">
                Live broadcast stream dispatched by <code className="font-mono">EscalationPublisher</code>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNotificationHubOpen(false)}
            className="p-1.5 rounded-xl text-navy-600 hover:text-navy-900 hover:bg-subtle transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-border bg-white shrink-0">
          <button
            onClick={() => setActiveChannel('telegram')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeChannel === 'telegram'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-navy-600 hover:text-navy-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram Notifier Stream ({telegramDispatches.length})</span>
          </button>
          <button
            onClick={() => setActiveChannel('inapp')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeChannel === 'inapp'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-navy-600 hover:text-navy-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>In-App Event Bus ({inAppEvents.length})</span>
          </button>
        </div>

        {/* Stream Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          
          {activeChannel === 'telegram' && (
            <>
              {telegramDispatches.length === 0 ? (
                <div className="text-center py-10 bg-subtle/50 rounded-2xl border border-dashed border-border p-6">
                  <span className="text-3xl mb-2 inline-block">📱</span>
                  <div className="text-xs font-bold text-navy-800">No Telegram Broadcasts Yet</div>
                  <p className="text-[11px] text-navy-600 max-w-sm mx-auto mt-1">
                    When an escalation triggers (closing return window or CPSC recall), the Telegram observer formats a rich Markdown payload ready for bot delivery.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {telegramDispatches.map((msg, idx) => (
                    <div
                      key={idx}
                      className="bg-navy-950 text-emerald-300 rounded-2xl p-4 font-mono text-xs border border-navy-800 shadow-md relative group"
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-navy-800 text-[10px] text-navy-400">
                        <span>DISPATCH #{telegramDispatches.length - idx}</span>
                        <button
                          onClick={() => handleCopy(msg, idx)}
                          className="inline-flex items-center gap-1 text-navy-300 hover:text-white bg-navy-800 px-2 py-0.5 rounded transition-all cursor-pointer"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Message</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap leading-relaxed text-navy-100">
                        {msg}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeChannel === 'inapp' && (
            <>
              {inAppEvents.length === 0 ? (
                <div className="text-center py-10 bg-subtle/50 rounded-2xl border border-dashed border-border p-6">
                  <span className="text-3xl mb-2 inline-block">📡</span>
                  <div className="text-xs font-bold text-navy-800">No In-App Events Logged</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {inAppEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-3.5 rounded-xl border border-border flex items-start justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg">
                          {evt.type === 'recall_match' ? '🚨' : '⏰'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-navy-900">{evt.item_name}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-subtle text-navy-600">
                              {evt.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-navy-600 mt-0.5">{evt.reason}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-navy-400 shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-subtle/50 flex justify-between items-center shrink-0">
          <div className="text-[11px] text-navy-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>EscalationPublisher Active</span>
          </div>
          <button
            onClick={() => setIsNotificationHubOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-navy-800 hover:bg-navy-900 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Send, Copy, Check, Sparkles, Mail } from 'lucide-react';
import { useAlerts, useApproveAlert, useDismissAlert } from '../api/client';
import { useGuardianStore } from '../store/useGuardianStore';
import type { Escalation } from '../types';

export const AlertFeed: React.FC = () => {
  const { data: alerts = [], isLoading } = useAlerts('pending');
  const approveMutation = useApproveAlert();
  const dismissMutation = useDismissAlert();
  const { addToast } = useGuardianStore();
  
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleApprove = (alert: Escalation) => {
    approveMutation.mutate(
      { id: alert.id },
      {
        onSuccess: () => {
          addToast({
            title: 'Action Approved & Dispatched',
            message: `Pre-drafted ${alert.type === 'recall_match' ? 'safety recall claim' : 'return request'} approved for ${alert.item_name || 'item'}. Observer notified.`,
            type: 'success',
          });
        },
        onError: (err: any) => {
          addToast({
            title: 'Approval Failed',
            message: err.message || 'Could not approve action',
            type: 'urgent',
          });
        },
      }
    );
  };

  const handleDismiss = (alert: Escalation) => {
    dismissMutation.mutate(alert.id, {
      onSuccess: () => {
        addToast({
          title: 'Alert Dismissed',
          message: 'Escalation archived without action.',
          type: 'info',
        });
      },
    });
  };

  const copyDraft = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addToast({
      title: 'Draft Copied',
      message: 'Pre-drafted text copied to clipboard.',
      type: 'info',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl p-12 text-center border border-border">
        <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-sm font-semibold text-navy-800">Checking Active Escalations...</div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-surface rounded-2xl p-12 text-center border border-border shadow-soft">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-3xl">
          ✅
        </div>
        <h3 className="text-base font-bold text-navy-900 mb-1">No Active Escalations</h3>
        <p className="text-xs text-navy-600 max-w-md mx-auto">
          All your purchases are currently within safe return windows and have zero matching CPSC safety recalls.
          Aegis will remain silent until your decision is strictly required.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <span>Escalations Awaiting 1-Click Approval</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-recall-badge text-recall-text border border-recall-border">
              {alerts.length} Pending
            </span>
          </h3>
          <p className="text-xs text-navy-600">
            Pre-drafted action messages prepared by DraftAgent via Bedrock. Review and approve with 1 click.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {alerts.map((alert) => {
          const isRecall = alert.type === 'recall_match';

          return (
            <div
              key={alert.id}
              className={`rounded-2xl p-5 border transition-all ${
                isRecall
                  ? 'bg-recall-light/50 border-recall-border shadow-urgent'
                  : 'bg-surface border-amber-300 shadow-soft'
              }`}
            >
              {/* Alert Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isRecall
                      ? 'bg-recall-badge text-recall-accent border border-recall-border'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {isRecall ? '🚨' : '⏰'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                        isRecall
                          ? 'bg-recall-badge text-recall-accent'
                          : 'bg-amber-200 text-amber-900'
                      }`}>
                        {isRecall ? 'CPSC Safety Recall Detected' : 'Return Window Closing'}
                      </span>
                      {alert.cpsc_recall_id && (
                        <span className="text-xs font-mono font-semibold text-recall-text">
                          Recall #{alert.cpsc_recall_id}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-base text-navy-900 mt-1">
                      {alert.item_name || 'Tracked Item'}
                    </h4>

                    <p className="text-xs text-navy-700 font-medium mt-0.5">
                      {alert.reason}
                    </p>
                  </div>
                </div>

                {/* Recipient info */}
                {alert.draft_recipient && (
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-semibold text-navy-600">Target Support</div>
                    <div className="text-xs font-bold text-navy-800">{alert.draft_recipient}</div>
                  </div>
                )}
              </div>

              {/* Pre-drafted action box */}
              <div className="mt-3 bg-white/95 rounded-xl border border-border/80 p-3.5 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pre-Drafted Action Communication (Bedrock / Strands)</span>
                  </div>
                  
                  <button
                    onClick={() => copyDraft(alert.draft_action, alert.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-navy-600 hover:text-navy-900 px-2 py-1 rounded bg-subtle hover:bg-border/50 transition-all cursor-pointer"
                  >
                    {copiedId === alert.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="text-xs font-mono text-navy-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-1">
                  {alert.draft_action}
                </pre>
              </div>

              {/* 1-Click Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-border/60 flex-wrap">
                <button
                  onClick={() => {
                    const recipient = alert.draft_recipient || 'support@retailer.com';
                    const subject = alert.type === 'recall_match'
                      ? `URGENT: Safety Recall Claim — CPSC Recall #${alert.cpsc_recall_id || ''} (${alert.item_name || ''})`
                      : `Return Request for ${alert.item_name || 'Order'}`;
                    const url = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(alert.draft_action)}`;
                    window.open(url, '_blank');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-navy-700 hover:text-navy-900 border border-border bg-white hover:bg-subtle transition-all cursor-pointer shadow-xs"
                  title="Open draft directly in your default email client"
                >
                  <Mail className="w-3.5 h-3.5 text-navy-600" />
                  <span>Open in Mail</span>
                </button>

                <button
                  onClick={() => handleDismiss(alert)}
                  disabled={dismissMutation.isPending}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-navy-600 hover:text-navy-900 hover:bg-subtle transition-all cursor-pointer"
                >
                  Dismiss
                </button>

                <button
                  onClick={() => handleApprove(alert)}
                  disabled={approveMutation.isPending}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 cursor-pointer ${
                    isRecall
                      ? 'bg-recall-accent hover:bg-recall-text'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{approveMutation.isPending ? 'Dispatching...' : '✅ 1-Click Approve & Dispatch'}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

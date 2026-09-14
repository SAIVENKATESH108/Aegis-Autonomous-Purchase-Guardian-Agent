import React from 'react';
import { X } from 'lucide-react';
import { useGuardianStore } from '../store/useGuardianStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGuardianStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isUrgent = toast.type === 'urgent';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 border shadow-elevated transition-all flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-200 ${
              isUrgent
                ? 'bg-recall-light border-recall-border text-recall-text'
                : isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-surface border-border text-navy-900'
            }`}
          >
            <div className="shrink-0 mt-0.5 text-base">
              {isUrgent ? '🚨' : isSuccess ? '✅' : 'ℹ️'}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold leading-snug">{toast.title}</h5>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md hover:bg-black/5 transition-all text-current opacity-60 hover:opacity-100 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

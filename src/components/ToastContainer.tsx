import React, { useEffect, useState } from 'react';
import { toast, ToastMessage } from '../lib/toast';
import { CheckCircle2, AlertCircle, XCircle, Info, X, QrCode } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((updatedToasts) => {
      setToasts(updatedToasts);
    });
    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((item) => {
        const isSuccess = item.type === 'success';
        const isError = item.type === 'error';
        const isWarning = item.type === 'warning';

        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              isSuccess
                ? 'bg-slate-900/95 dark:bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/30'
                : isError
                ? 'bg-slate-900/95 dark:bg-slate-900/95 text-white border-rose-500/50 shadow-rose-950/30'
                : isWarning
                ? 'bg-slate-900/95 dark:bg-slate-900/95 text-white border-amber-500/50 shadow-amber-950/30'
                : 'bg-slate-900/95 dark:bg-slate-900/95 text-white border-blue-500/50 shadow-blue-950/30'
            }`}
          >
            {/* Icon badge */}
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                isSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isError
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : isError ? (
                <XCircle className="w-5 h-5 text-rose-400" />
              ) : isWarning ? (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              ) : (
                <Info className="w-5 h-5 text-blue-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100">
                  <QrCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </div>
                {item.timestamp && (
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                    {item.timestamp}
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1 break-words">
                  {item.description}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => toast.remove(item.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 -mr-1 -mt-1"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

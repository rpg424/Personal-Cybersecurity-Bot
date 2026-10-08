import React, { useState } from 'react';
import { X, AlertOctagon, WifiOff, Wifi, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface PanicModalProps {
  isIsolated: boolean;
  onClose: () => void;
  onStateChanged: () => void;
}

export const PanicModal: React.FC<PanicModalProps> = ({
  isIsolated,
  onClose,
  onStateChanged,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleIsolation = async () => {
    setIsExecuting(true);
    setError(null);
    try {
      const idempotencyKey = `panic-${Date.now()}`;
      await api.triggerPanic(!isIsolated, idempotencyKey);
      onStateChanged();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update network isolation state.');
      setIsExecuting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="panic-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white border border-rose-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/70">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h2 id="panic-title" className="text-base font-bold text-slate-900 tracking-tight">
              {isIsolated ? 'Restore Network Connectivity' : 'Emergency Panic Isolation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-rose-100/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-800">
          {!isIsolated ? (
            <>
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2">
                <span className="font-bold text-rose-900 flex items-center gap-1.5">
                  <WifiOff className="w-4 h-4 text-rose-600" />
                  What happens when you isolate this PC:
                </span>
                <ul className="list-disc list-inside space-y-1 text-rose-900">
                  <li>All outgoing internet and Wi-Fi traffic is temporarily severed.</li>
                  <li>Inbound network connections from other devices are blocked.</li>
                  <li>Localhost protection IPC (127.0.0.1) remains 100% active.</li>
                  <li>Your files and local apps remain completely safe.</li>
                </ul>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Use Panic Mode if you suspect your computer is actively sending unauthorized information or communicating with a remote attacker. You can restore your network with a single click at any time.
              </p>
            </>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-emerald-600" />
                Restore standard network access:
              </span>
              <p className="text-emerald-900 leading-relaxed">
                Your computer is currently isolated from the internet. Clicking below will re-enable Wi-Fi and Ethernet adapters to resume normal web access.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleToggleIsolation}
            disabled={isExecuting}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${
              isIsolated
                ? 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500'
                : 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500'
            }`}
          >
            {isExecuting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isIsolated ? 'Restore Connectivity' : 'Isolate Network Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

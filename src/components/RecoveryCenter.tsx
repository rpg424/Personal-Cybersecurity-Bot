import React, { useState } from 'react';
import { Lock, RotateCcw, ShieldCheck, CheckCircle2, Trash2 } from 'lucide-react';
import { QuarantineItem } from '../types/security';

interface RecoveryCenterProps {
  items: QuarantineItem[];
  isLoading: boolean;
  onRestore: (quarantineId: string) => void;
  onPurgeItem?: (quarantineId: string) => void;
  onRefresh: () => void;
}

export const RecoveryCenter: React.FC<RecoveryCenterProps> = ({
  items,
  isLoading,
  onRestore,
  onPurgeItem,
  onRefresh,
}) => {
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const activeQuarantine = items.filter((i) => !i.restored_at_utc);
  const restoredQuarantine = items.filter((i) => Boolean(i.restored_at_utc));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Recovery Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Safely review, inspect, or restore quarantined files from your local encrypted vault.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Local Vault Encrypted (AES-256)</span>
        </div>
      </div>

      {/* Quarantined Items List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : activeQuarantine.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Quarantine Vault is Clean</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No active files are currently held in quarantine. When suspicious files are intercepted, they are stored securely here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Files in Encrypted Vault ({activeQuarantine.length})
          </h2>

          <div className="space-y-3">
            {activeQuarantine.map((item) => (
              <div
                key={item.quarantine_id}
                className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono text-slate-800 font-bold">{item.quarantine_id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{(item.file_size_bytes / 1024).toFixed(1)} KB</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(item.quarantined_at_utc).toLocaleDateString()}</span>
                  </div>

                  <div className="font-mono text-xs text-slate-900 break-all font-semibold">
                    {item.original_path}
                  </div>

                  <p className="text-xs text-slate-600">{item.risk_notes}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onRestore(item.quarantine_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Safe Restore</span>
                  </button>

                  {onPurgeItem && (
                    <>
                      {confirmPurgeId === item.quarantine_id ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg">
                          <button
                            onClick={() => {
                              onPurgeItem(item.quarantine_id);
                              setConfirmPurgeId(null);
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors shadow-2xs"
                          >
                            Confirm Purge
                          </button>
                          <button
                            onClick={() => setConfirmPurgeId(null)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmPurgeId(item.quarantine_id)}
                          title="Permanently remove file from vault"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previously Restored History */}
      {restoredQuarantine.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Restored Files ({restoredQuarantine.length})
          </h2>
          <div className="space-y-2">
            {restoredQuarantine.map((item) => (
              <div
                key={item.quarantine_id}
                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600"
              >
                <div className="font-mono text-slate-800 break-all">{item.original_path}</div>
                <div className="flex items-center gap-1 text-emerald-700 font-semibold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Restored on {new Date(item.restored_at_utc!).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safe Mode & Recovery Guidance */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
        <h3 className="font-bold text-slate-900">How Recovery Works</h3>
        <p className="text-slate-600 leading-relaxed">
          Files placed in quarantine are stripped of execution permissions and stored inside an encrypted database. If you know a file was safe (for example, custom software developed by you), clicking "Safe Restore" safely decrypts it back to its original location.
        </p>
      </div>
    </div>
  );
};

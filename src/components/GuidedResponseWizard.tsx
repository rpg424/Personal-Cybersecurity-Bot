import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Loader2,
  Lock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { AlertItem, OperationPreviewData, OperationRecord } from '../types/security';
import { api } from '../api/client';

interface GuidedResponseWizardProps {
  actionType: 'stop' | 'quarantine';
  target: string;
  alert: AlertItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const GuidedResponseWizard: React.FC<GuidedResponseWizardProps> = ({
  actionType,
  target,
  alert,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'preview' | 'executing' | 'completed' | 'error'>('preview');
  const [preview, setPreview] = useState<OperationPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [operationResult, setOperationResult] = useState<OperationRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate unique idempotency key once per session to avoid duplicate execution
  const [idempotencyKey] = useState<string>(() => `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;
    api
      .previewAction({
        action_type: actionType,
        target,
        alert_id: alert?.id,
      })
      .then((data) => {
        if (isMounted) {
          setPreview(data);
          setIsLoadingPreview(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to generate impact preview.');
          setIsLoadingPreview(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [actionType, target, alert]);

  const handleAuthorizeAndExecute = async () => {
    setStep('executing');
    try {
      let result: OperationRecord;
      if (actionType === 'stop') {
        result = await api.stopProcess({
          target,
          alert_id: alert?.id,
          idempotency_key: idempotencyKey,
        });
      } else {
        result = await api.quarantineFile({
          target,
          alert_id: alert?.id,
          idempotency_key: idempotencyKey,
        });
      }
      setOperationResult(result);
      setStep('completed');
    } catch (err: any) {
      setErrorMessage(err.message || 'Action failed to execute.');
      setStep('error');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 id="wizard-title" className="text-base font-bold text-slate-900 tracking-tight">
                Guided Safe Response Wizard
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Action: {actionType === 'stop' ? 'Terminate Process' : 'Encrypted Quarantine'}
              </span>
            </div>
          </div>
          {step !== 'executing' && (
            <button
              onClick={onClose}
              aria-label="Cancel action"
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-slate-800">
          {step === 'preview' && (
            <>
              {isLoadingPreview ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs text-slate-500">Evaluating safety boundaries and impact...</p>
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Expected System Impact
                    </span>
                    <p className="text-sm text-slate-800 leading-relaxed">
                      {preview.impact_summary}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">Target Object:</span>
                      <span className="font-mono text-slate-900 font-medium break-all">{target}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">Reversibility:</span>
                      <span className={preview.rollback_possible ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                        {preview.rollback_possible
                          ? 'Fully Restorable via Recovery Center'
                          : 'Irreversible (Process will terminate cleanly)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">Protection Integrity:</span>
                      <span className="text-emerald-700 font-semibold">Verified Local Authority</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Shield Labs Bot never deletes your files outright. Quarantined files are encrypted in your local vault and can be reviewed or restored anytime.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
                  {errorMessage || 'Failed to load preview.'}
                </div>
              )}
            </>
          )}

          {step === 'executing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Applying Safe Remediation</h3>
                <p className="text-xs text-slate-500">
                  Executing authorization and logging signed audit event...
                </p>
              </div>
            </div>
          )}

          {step === 'completed' && operationResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Remediation Successful</h3>
                  <p className="text-xs text-slate-700">{operationResult.message}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Operation ID:</span>
                  <span className="font-mono text-slate-700">{operationResult.operation_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Audit Record:</span>
                  <span className="font-mono text-slate-700">{operationResult.audit_event_id}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-700">
                    {new Date(operationResult.requested_at_utc).toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                You can review this action in your Timeline and History tabs. If you quarantined a file by mistake, visit the Recovery Center.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Execution Issue</h3>
                  <p className="text-xs text-rose-800">{errorMessage}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                No partial state changes were made. You may safely retry or review technical details.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          {step === 'preview' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAuthorizeAndExecute}
                disabled={isLoadingPreview || !preview}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${
                  actionType === 'stop'
                    ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500'
                }`}
              >
                Confirm & Authorize
              </button>
            </>
          )}

          {step === 'completed' && (
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              Done
            </button>
          )}

          {step === 'error' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import {
  X,
  FileCode,
  Clock,
  MessageSquareCode,
  Shield,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { AlertItem } from '../types/security';

interface AlertDetailModalProps {
  alert: AlertItem | null;
  onClose: () => void;
  onStartAction: (actionType: string, target: string, alert: AlertItem) => void;
  onAskAssistantAboutAlert: (alert: AlertItem) => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  alert,
  onClose,
  onStartAction,
  onAskAssistantAboutAlert,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!alert) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <div>
              <h2 id="alert-detail-title" className="text-base font-bold text-slate-900 tracking-tight">
                Alert Triage & Technical Evidence
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">Incident Record</span>
                <span>{alert.id}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{alert.detector_id} (v{alert.detector_version})</span>
              </div>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-800">
          {/* Plain Language Summary */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              What Happened
            </h3>
            <p className="text-slate-800 leading-relaxed text-sm">
              {alert.plain_language_summary}
            </p>
          </div>

          {/* Why Risky & Recommended Action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
              <h3 className="text-xs font-bold text-amber-900">Why It Matters</h3>
              <p className="text-xs text-amber-950 leading-relaxed">{alert.why_risky}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
              <h3 className="text-xs font-bold text-emerald-900">Recommended Step</h3>
              <p className="text-xs text-emerald-950 leading-relaxed">{alert.recommendation}</p>
            </div>
          </div>

          {/* Evidence Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-emerald-600" />
              Verified Telemetry Evidence
            </h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden font-mono text-xs divide-y divide-slate-200">
              {alert.evidence.process_name && (
                <div className="flex px-4 py-2.5">
                  <span className="w-36 text-slate-500 shrink-0 font-medium">Process:</span>
                  <span className="text-slate-900 break-all">{alert.evidence.process_name} (PID: {alert.evidence.pid})</span>
                </div>
              )}
              {alert.evidence.command_line && (
                <div className="flex px-4 py-2.5">
                  <span className="w-36 text-slate-500 shrink-0 font-medium">Command:</span>
                  <span className="text-slate-900 break-all">{alert.evidence.command_line}</span>
                </div>
              )}
              {alert.evidence.parent_process && (
                <div className="flex px-4 py-2.5">
                  <span className="w-36 text-slate-500 shrink-0 font-medium">Parent:</span>
                  <span className="text-slate-900">{alert.evidence.parent_process}</span>
                </div>
              )}
              {alert.evidence.destination_path && (
                <div className="flex px-4 py-2.5">
                  <span className="w-36 text-slate-500 shrink-0 font-medium">File Path:</span>
                  <span className="text-slate-900 break-all">{alert.evidence.destination_path}</span>
                </div>
              )}
              {alert.evidence.file_hash_sha256 && (
                <div className="flex px-4 py-2.5">
                  <span className="w-36 text-slate-500 shrink-0 font-medium">SHA-256:</span>
                  <span className="text-slate-900 break-all">{alert.evidence.file_hash_sha256}</span>
                </div>
              )}
              {alert.evidence.target_url && (
                <div className="flex px-4 py-2.5">
                  <span className="w-36 text-slate-500 shrink-0 font-medium">URL:</span>
                  <span className="text-slate-900 break-all">{alert.evidence.target_url}</span>
                </div>
              )}
            </div>
          </div>

          {/* Confidence & Uncertainty Explanation */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900">Confidence Calibration</span>
              <p className="text-slate-600">{alert.confidence_rationale}</p>
            </div>
            <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
              {(alert.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Attached Research Findings */}
          {alert.research_attachments && alert.research_attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-emerald-600" />
                Attached Threat Research Intel ({alert.research_attachments.length})
              </h3>
              <div className="space-y-2">
                {alert.research_attachments.map((card) => (
                  <div
                    key={card.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {card.classification}
                        </span>
                        <span>{card.source_name}</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-700">
                        {(card.confidence * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                    <p className="text-slate-700 italic">"{card.direct_quote_or_fact}"</p>
                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                      <a
                        href={card.exact_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>{card.exact_url}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span>·</span>
                      <span>Retrieved: {new Date(card.retrieval_timestamp_utc).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Causal Timeline */}
          {alert.timeline && alert.timeline.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                Chronological Causality Chain
              </h3>
              <div className="border-l-2 border-slate-200 ml-2 pl-3 space-y-2.5 text-xs">
                {alert.timeline.map((step, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(step.timestamp_utc).toLocaleTimeString()}
                    </span>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Safe Guided Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => onAskAssistantAboutAlert(alert)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
          >
            <MessageSquareCode className="w-4 h-4 text-emerald-600" />
            <span>Ask Assistant in Plain English</span>
          </button>

          <div className="flex items-center gap-3">
            {alert.supported_actions.includes('stop') && alert.state === 'unresolved' && (
              <button
                onClick={() =>
                  onStartAction('stop', alert.evidence.process_name || `PID:${alert.evidence.pid}`, alert)
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Safe Stop Process
              </button>
            )}

            {alert.supported_actions.includes('quarantine') && alert.state === 'unresolved' && (
              <button
                onClick={() =>
                  onStartAction('quarantine', alert.evidence.destination_path || 'unknown_target', alert)
                }
                className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Quarantine File
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

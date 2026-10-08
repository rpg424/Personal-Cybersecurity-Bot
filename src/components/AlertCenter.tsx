import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { AlertItem, AlertSeverity } from '../types/security';

interface AlertCenterProps {
  alerts: AlertItem[];
  isLoading: boolean;
  onSelectAlert: (alert: AlertItem) => void;
  onQuickAction: (action: 'stop' | 'quarantine', alert: AlertItem) => void;
  onRefresh: () => void;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  alerts,
  isLoading,
  onSelectAlert,
  onQuickAction,
  onRefresh,
}) => {
  const [filterState, setFilterState] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const filteredAlerts = alerts.filter((alert) => {
    if (filterState !== 'all' && alert.state !== filterState) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    return true;
  });

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-rose-700">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
            Critical Threat
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            High Caution
          </span>
        );
      case 'medium':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-sky-700">
            <Info className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
            Moderate Risk
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <Info className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            Notice
          </span>
        );
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Alert Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Calm, transparent triage of system observations and security notifications.
          </p>
        </div>

        {/* Interactive Segmented Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg">
            <button
              onClick={() => setFilterState('unresolved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterState === 'unresolved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unresolved ({alerts.filter((a) => a.state === 'unresolved').length})
            </button>
            <button
              onClick={() => setFilterState('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterState === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilterState('resolved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterState === 'resolved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved ({alerts.filter((a) => a.state === 'resolved').length})
            </button>
          </div>

          <button
            onClick={onRefresh}
            aria-label="Refresh alerts list"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerts List Container */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No alerts found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterState === 'unresolved'
              ? 'All security notifications have been resolved. Your PC is running with active protection shields.'
              : 'No alerts match your current filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAlerts.map((alert) => (
            <article
              key={alert.id}
              className={`p-5 rounded-xl border transition-all shadow-xs ${
                alert.state === 'unresolved'
                  ? 'bg-white border-slate-200/90 hover:border-slate-300'
                  : 'bg-slate-50/80 border-slate-200 opacity-80'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Clean unboxed metadata with typographic separators */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Security Audit
                    </span>
                    <span aria-hidden="true">·</span>
                    {getSeverityBadge(alert.severity)}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-600 font-medium">{alert.detector_id}</span>
                    <span aria-hidden="true">·</span>
                    <span>Confidence: {(alert.confidence * 100).toFixed(0)}%</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-400">
                      {new Date(alert.created_at_utc).toLocaleTimeString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {alert.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {alert.plain_language_summary}
                  </p>

                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                    <span className="font-semibold text-slate-800">Action taken:</span>
                    <span>{alert.what_product_did}</span>
                  </div>
                </div>

                {/* Action Affordances */}
                <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
                  {alert.state === 'unresolved' && (
                    <>
                      {alert.supported_actions.includes('stop') && (
                        <button
                          onClick={() => onQuickAction('stop', alert)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          Stop Process
                        </button>
                      )}
                      {alert.supported_actions.includes('quarantine') && (
                        <button
                          onClick={() => onQuickAction('quarantine', alert)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          Quarantine File
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => onSelectAlert(alert)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

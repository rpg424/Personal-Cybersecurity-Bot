import React from 'react';
import { Download, CheckCircle2, Info } from 'lucide-react';
import { WeeklyReportSummary, EventEnvelope } from '../types/security';

interface HistoryAndReportProps {
  report: WeeklyReportSummary | undefined;
  events: EventEnvelope[];
  isLoading: boolean;
  onExportData: () => void;
}

export const HistoryAndReport: React.FC<HistoryAndReportProps> = ({
  report,
  events,
  isLoading,
  onExportData,
}) => {
  if (isLoading || !report) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-4 animate-pulse">
        <div className="h-48 bg-slate-100 rounded-xl border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header with Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Local Weekly Security Report</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Calm, privacy-first summary of your PC protection over the past 7 days.
          </p>
        </div>

        <button
          onClick={onExportData}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export Audit Ledger (JSON)</span>
        </button>
      </div>

      {/* High-Level Weekly Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Observations</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {report.total_events_observed.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">All evaluated locally</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Threats Neutralized</span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
            {report.threats_neutralized}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Zero file harm</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Active Quarantines</span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
            {report.active_quarantine_count}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Encrypted in local vault</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">System Stability</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {report.system_stability_score}%
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">Optimal CPU & Memory</span>
        </div>
      </div>

      {/* Observations and Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Key Safety Observations
          </h2>
          <ul className="space-y-2.5 text-xs text-slate-700">
            {report.top_observations.map((obs, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{obs}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600" />
            Recommended Habits
          </h2>
          <ul className="space-y-2.5 text-xs text-slate-700">
            {report.recommended_actions.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Transparent Boundaries and Limitations */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
        <h3 className="font-bold text-slate-900">Honest Limitations Notice</h3>
        <p className="text-slate-600 leading-relaxed">
          Shield Labs Bot operates defensively on your local PC. It coexists with Windows Defender without disabling or weakening Microsoft antivirus features. Core protection runs 100% offline. No telemetry or personal document content is sent to third-party servers.
        </p>
      </div>
    </div>
  );
};

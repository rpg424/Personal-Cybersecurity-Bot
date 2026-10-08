import React, { useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { EventEnvelope } from '../types/security';

interface TimelineViewProps {
  events: EventEnvelope[];
  isLoading: boolean;
  onRefresh: () => void;
  isStreamConnected: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  events,
  isLoading,
  onRefresh,
  isStreamConnected,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredEvents = events.filter((ev) => {
    if (filterType === 'all') return true;
    return ev.event_type.startsWith(filterType);
  });

  const getEventBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">CRITICAL</span>;
      case 'high':
        return <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">HIGH</span>;
      case 'medium':
        return <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">MEDIUM</span>;
      default:
        return <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">INFO</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">What Just Happened?</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-slate-200 shadow-xs">
              <span className={`w-2 h-2 rounded-full ${isStreamConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-slate-600 font-medium">{isStreamConnected ? 'Live SSE' : 'Offline'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological, immutable audit replay of all system observations and security actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
          >
            <option value="all">All Events</option>
            <option value="action">Remediation Actions</option>
            <option value="simulation">Simulations</option>
            <option value="service">Service Lifecycle</option>
            <option value="enrollment">Enrollment</option>
            <option value="auth">Console Auth</option>
          </select>

          <button
            onClick={onRefresh}
            aria-label="Refresh timeline"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Events Timeline Container */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <p className="text-sm font-bold text-slate-900">No events recorded in this filter</p>
          <p className="text-xs text-slate-500">Events will stream here automatically as they occur.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
          {filteredEvents.map((ev) => (
            <div key={ev.event_id} className="relative group">
              {/* Timeline Dot */}
              <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-emerald-500 group-hover:scale-125 transition-transform" />

              <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getEventBadge(ev.severity)}
                    <span className="text-xs font-bold text-slate-900 font-mono">{ev.event_type}</span>
                    <span className="text-[11px] text-slate-400 font-mono">Seq #{ev.sequence}</span>
                  </div>

                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(ev.occurred_at_utc).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="text-slate-500 font-mono">Source: </span>
                  <span className="text-slate-800 font-medium">{ev.source}</span>
                  <span className="text-slate-300 mx-2">|</span>
                  <span className="text-slate-500 font-mono">Target: </span>
                  <span className="text-slate-800 font-medium">{ev.object_ref}</span>
                </div>

                {ev.payload && Object.keys(ev.payload).length > 0 && (
                  <pre className="p-2.5 rounded-lg bg-slate-50 text-[11px] font-mono text-slate-700 overflow-x-auto border border-slate-200">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

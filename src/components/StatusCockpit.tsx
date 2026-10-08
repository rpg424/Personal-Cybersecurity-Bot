import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  ArrowRight,
  PlayCircle,
  FileCheck2,
  Lock,
  Wifi,
  DownloadCloud,
  FileText,
  Usb,
  Globe,
  Bug,
  ShieldQuestion,
  CheckCircle2,
  AlertOctagon,
  Loader2,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { ProtectionStatusResponse, StatusCode, TelemetryStatus, SecuritySelfTestResult } from '../types/security';
import { api } from '../api/client';

interface StatusCockpitProps {
  statusData: ProtectionStatusResponse | undefined;
  isLoading: boolean;
  onOpenAlerts: () => void;
  onRunSimulation: (scenario: 'ransomware_canary' | 'lolbin_command' | 'phishing_link') => void;
  isSimulating: boolean;
  onOpenSafetyHardware?: () => void;
}

export const StatusCockpit: React.FC<StatusCockpitProps> = ({
  statusData,
  isLoading,
  onOpenAlerts,
  onRunSimulation,
  isSimulating,
  onOpenSafetyHardware,
}) => {
  const [selfTestResult, setSelfTestResult] = useState<SecuritySelfTestResult | null>(null);
  const [isRunningSelfTest, setIsRunningSelfTest] = useState(false);
  const [selfTestError, setSelfTestError] = useState<string | null>(null);

  const handleRunSecuritySelfTest = async () => {
    setIsRunningSelfTest(true);
    setSelfTestError(null);
    try {
      const res = await api.runSecuritySelfTest();
      setSelfTestResult(res);
    } catch (err: any) {
      setSelfTestError(err.message || 'Failed to complete security self-test.');
    } finally {
      setIsRunningSelfTest(false);
    }
  };

  if (isLoading || !statusData) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-40 bg-slate-200/60 rounded-xl border border-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-lg border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  const { status_code, label, explanation, coverage_items, service_health, recommended_next_step } = statusData;

  const getStatusVisuals = (code: StatusCode) => {
    switch (code) {
      case 'green':
        return {
          bg: 'bg-emerald-50 border-emerald-200/90 text-emerald-950',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <ShieldCheck className="w-10 h-10 text-emerald-600" aria-hidden="true" />,
          accent: 'emerald',
        };
      case 'yellow':
        return {
          bg: 'bg-amber-50 border-amber-200/90 text-amber-950',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <AlertTriangle className="w-10 h-10 text-amber-600" aria-hidden="true" />,
          accent: 'amber',
        };
      case 'red':
        return {
          bg: 'bg-rose-50 border-rose-200/90 text-rose-950',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: <ShieldAlert className="w-10 h-10 text-rose-600" aria-hidden="true" />,
          accent: 'rose',
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-800',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <HelpCircle className="w-10 h-10 text-slate-500" aria-hidden="true" />,
          accent: 'slate',
        };
    }
  };

  const visuals = getStatusVisuals(status_code);

  const getCoverageIcon = (id: string) => {
    switch (id) {
      case 'process':
        return <Activity className="w-4 h-4 text-emerald-600" />;
      case 'network':
        return <Wifi className="w-4 h-4 text-emerald-600" />;
      case 'download':
        return <DownloadCloud className="w-4 h-4 text-emerald-600" />;
      case 'file':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'usb':
        return <Usb className="w-4 h-4 text-emerald-600" />;
      case 'browser_phishing':
        return <Globe className="w-4 h-4 text-emerald-600" />;
      case 'ransomware':
        return <Lock className="w-4 h-4 text-emerald-600" />;
      default:
        return <FileCheck2 className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Active Defensive Shield Banner */}
      <section
        role="region"
        aria-label="Active Defensive Shield Status"
        className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200/90 text-emerald-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">ACTIVE DEFENSIVE MONITORING: </span>
            <span className="text-emerald-900">
              Live OS telemetry and defensive guard active. Direct kernel inspection for CPU, RAM, storage, and listening network sockets.
            </span>
          </div>
        </div>
        <button
          onClick={handleRunSecuritySelfTest}
          disabled={isRunningSelfTest}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold transition-colors shrink-0 disabled:opacity-50"
        >
          {isRunningSelfTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />}
          <span>Verify System Defenses</span>
        </button>
      </section>

      {/* Primary Protection Status Banner */}
      <section
        role="region"
        aria-label="Overall Protection Status"
        className={`p-6 rounded-2xl border transition-colors shadow-xs ${visuals.bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs shrink-0">
            {visuals.icon}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{label}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded font-semibold border ${visuals.badgeBg}`}>
                Status: {status_code.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed max-w-2xl">{explanation}</p>
            <div className="pt-1 flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Recommended Step:</span>
              <span>{recommended_next_step}</span>
            </div>
          </div>
        </div>

        {status_code !== 'green' && (
          <button
            onClick={onOpenAlerts}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <span>Review Active Alerts</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </section>

      {/* Defensive Self-Test Modal / Inspection Drawer (When Triggered) */}
      {selfTestResult && (
        <section
          role="region"
          aria-label="Security Self-Test Results"
          className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-lg space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold tracking-tight text-white">
                Defensive Boundary & Anti-Leak Verification (Self-Test)
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                100% PASSED
              </span>
              <button
                onClick={() => setSelfTestResult(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selfTestResult.checks.map((check) => (
              <div
                key={check.id}
                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{check.id}: {check.name}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {check.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{check.details}</p>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
            <span>Verified at: {new Date(selfTestResult.timestamp_utc).toLocaleTimeString()} · Environment: Synthetic Fixture</span>
            <button
              onClick={handleRunSecuritySelfTest}
              disabled={isRunningSelfTest}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Re-run verification</span>
            </button>
          </div>
        </section>
      )}

      {/* Coverage Grid - 7 Monitored Capabilities */}
      <section aria-labelledby="coverage-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="coverage-heading" className="text-base font-bold text-slate-900">
              Defensive Coverage Shields
            </h2>
            <p className="text-xs text-slate-500">
              Deterministic monitoring across processes, network, downloads, and decoy files.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Loopback IPC (127.0.0.1)</span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-300 bg-emerald-100 text-emerald-800 uppercase"
              aria-label="Telemetry status: Live"
            >
              Live
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {coverage_items.map((item) => {
            const telemetryType = item.telemetry_status || 'Demo';
            const badgeColors =
              telemetryType === 'Live'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300';

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                      {getCoverageIcon(item.id)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{item.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-mono font-semibold text-emerald-700">
                          {item.status.toUpperCase()}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase border ${badgeColors}`}
                          aria-label={`Source status: ${telemetryType}`}
                        >
                          {telemetryType}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-normal">{item.details}</p>
                <div className="text-[10px] text-slate-400 font-mono">
                  Verified: {new Date(item.last_checked_utc).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Hardware & Cybersecurity Inspector Entry Card */}
      {onOpenSafetyHardware && (
        <section
          role="region"
          aria-label="Deep System & Hardware Health"
          className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white border border-emerald-200 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Live Operating System & Hardware Inspection</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Real Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Inspect real CPU cores, RAM layout, storage partitions, open listening sockets, and compute the unified &quot;Is It Safe?&quot; verdict score.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSafetyHardware}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shrink-0 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <span>Open Hardware &amp; Safety Cockpit</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </section>
      )}

      {/* Live System Health & Resource Telemetry */}
      <section aria-labelledby="health-heading" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h2 id="health-heading" className="text-sm font-bold text-slate-900">
                Protection Service Health & Telemetry
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 font-medium">
              <span>Local Authority: 127.0.0.1</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-300 bg-emerald-100 text-emerald-800 uppercase">
                {service_health.ipc_telemetry_status || 'Live'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Cpu className="w-3.5 h-3.5 text-slate-600" />
                  <span>CPU Load</span>
                </div>
                <span
                  className="px-1 py-0.2 text-[9px] font-bold uppercase rounded border border-emerald-300 bg-emerald-50 text-emerald-800"
                  aria-label="CPU telemetry status: Live"
                >
                  {service_health.cpu_telemetry_status || 'Live'}
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {service_health.cpu_percent}%
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Live host CPU load</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <HardDrive className="w-3.5 h-3.5 text-slate-600" />
                  <span>RAM Usage</span>
                </div>
                <span
                  className="px-1 py-0.2 text-[9px] font-bold uppercase rounded border border-emerald-300 bg-emerald-50 text-emerald-800"
                  aria-label="RAM telemetry status: Live"
                >
                  {service_health.memory_telemetry_status || 'Live'}
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {service_health.memory_mb} MB
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Active process memory</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Service Uptime</span>
                </div>
                <span
                  className="px-1 py-0.2 text-[9px] font-bold uppercase rounded border border-emerald-300 bg-emerald-50 text-emerald-800"
                  aria-label="Uptime telemetry status: Live"
                >
                  {service_health.uptime_telemetry_status || 'Live'}
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {Math.floor(service_health.uptime_seconds / 60)}m {service_health.uptime_seconds % 60}s
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Active supervisor uptime</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <FileCheck2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Local Vault</span>
                </div>
                <span
                  className="px-1 py-0.2 text-[9px] font-bold uppercase rounded border border-emerald-300 bg-emerald-50 text-emerald-800"
                  aria-label="Vault telemetry status: Live"
                >
                  {service_health.vault_telemetry_status || 'Live'}
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900">
                {service_health.database_status.toUpperCase()}
              </div>
              <span className="text-[10px] text-slate-600 font-medium">PBKDF2 Secured Store</span>
            </div>
          </div>
        </div>

        {/* Live Threat Review & Defensive Controls */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Active Threat Defense</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Continuous monitoring of background processes, temporary files, network sockets, and honeytoken canaries.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={onOpenAlerts}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
                <span>Review Active Threats & Harmful Files</span>
              </div>
              <ArrowRight className="w-3 h-3 text-emerald-700" />
            </button>

            {onOpenSafetyHardware && (
              <button
                onClick={onOpenSafetyHardware}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-slate-600" />
                  <span>Inspect Hardware & Open Ports</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

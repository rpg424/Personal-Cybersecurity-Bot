import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Cpu,
  HardDrive,
  Activity,
  Network,
  Lock,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle,
  ExternalLink,
  Globe,
  Server,
  Radio,
  ArrowRight,
  Wifi,
  Copy,
  Check,
  Mouse,
  Usb,
  Info,
  Laptop,
} from 'lucide-react';
import { api } from '../api/client';
import {
  SafetyVerdictResponse,
  HardwareTelemetryResponse,
  SecurityPostureResponse,
  RemoteNodeProbeResponse,
  HostNetworkTelemetry,
  FleetNode,
} from '../types/security';

export const HardwareSafetyInspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'verdict' | 'hardware' | 'network' | 'persistence' | 'remote'>('verdict');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('local');
  const [remoteHost, setRemoteHost] = useState('192.168.29.1');
  const [remoteResult, setRemoteResult] = useState<RemoteNodeProbeResponse | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  const handleProbeRemoteNode = async (hostToProbe?: string) => {
    const target = hostToProbe || remoteHost;
    if (!target) return;
    setIsProbing(true);
    setProbeError(null);
    try {
      const res = await api.probeRemoteNode(target);
      setRemoteResult(res);
    } catch (err: any) {
      setProbeError(err.message || 'Failed to probe remote node');
    } finally {
      setIsProbing(false);
    }
  };

  // React Query hooks with automatic caching and retry
  const {
    data: verdict,
    isLoading: isVerdictLoading,
    refetch: refetchVerdict,
    isFetching: isVerdictFetching,
  } = useQuery<SafetyVerdictResponse>({
    queryKey: ['safety_verdict'],
    queryFn: api.getSafetyVerdict,
    refetchInterval: 12000,
  });

  const {
    data: hardware,
    isLoading: isHardwareLoading,
    refetch: refetchHardware,
  } = useQuery<HardwareTelemetryResponse>({
    queryKey: ['hardware_telemetry'],
    queryFn: api.getHardwareTelemetry,
    refetchInterval: 12000,
  });

  const {
    data: posture,
    isLoading: isPostureLoading,
    refetch: refetchPosture,
  } = useQuery<SecurityPostureResponse>({
    queryKey: ['security_posture'],
    queryFn: api.getSecurityPosture,
    refetchInterval: 12000,
  });

  const {
    data: networkData,
    refetch: refetchNetwork,
  } = useQuery<HostNetworkTelemetry>({
    queryKey: ['host_network'],
    queryFn: api.getNetworkInterfaces,
    refetchInterval: 12000,
  });

  const { data: authSession } = useQuery({
    queryKey: ['auth_session'],
    queryFn: api.getAuthSession,
    refetchInterval: 15000,
  });

  const effectiveRole = authSession?.role || localStorage.getItem('pcb_user_role') || 'NO_ROLE';
  const isAdmin = effectiveRole === 'ADMIN';

  const { data: fleetData } = useQuery({
    queryKey: ['fleet_nodes'],
    queryFn: api.getFleetNodes,
    refetchInterval: 10000,
  });

  const fleetNodes: FleetNode[] = fleetData?.nodes || [];
  const remoteFleetNodes: FleetNode[] = fleetNodes.filter((n: FleetNode) => !n.isLocal);
  const selectedRemoteNode: FleetNode | undefined =
    isAdmin && selectedNodeId !== 'local'
      ? remoteFleetNodes.find((n: FleetNode) => n.id === selectedNodeId)
      : undefined;

  // For non-admin users, if activeTab is remote, fall back to verdict
  React.useEffect(() => {
    if (!isAdmin && activeTab === 'remote') {
      setActiveTab('verdict');
    }
  }, [isAdmin, activeTab]);

  const handleRefreshAll = () => {
    refetchVerdict();
    refetchHardware();
    refetchPosture();
    refetchNetwork();
  };

  const getVerdictVisuals = (v: string | undefined) => {
    switch (v) {
      case 'SECURE & HEALTHY':
        return {
          banner: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          scoreBadge: 'text-emerald-700 bg-emerald-100/80 border-emerald-300',
          icon: <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" aria-hidden="true" />,
        };
      case 'ACTION RECOMMENDED':
        return {
          banner: 'bg-amber-50/90 border-amber-200 text-amber-950',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          scoreBadge: 'text-amber-700 bg-amber-100/80 border-amber-300',
          icon: <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" aria-hidden="true" />,
        };
      case 'CRITICAL RISK':
        return {
          banner: 'bg-rose-50/90 border-rose-200 text-rose-950',
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          scoreBadge: 'text-rose-700 bg-rose-100/80 border-rose-300',
          icon: <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0" aria-hidden="true" />,
        };
      default:
        return {
          banner: 'bg-slate-50 border-slate-200 text-slate-800',
          badge: 'bg-slate-100 text-slate-700 border-slate-300',
          scoreBadge: 'text-slate-700 bg-slate-100 border-slate-300',
          icon: <HelpCircle className="w-8 h-8 text-slate-500 shrink-0" aria-hidden="true" />,
        };
    }
  };

  const isRefreshing = isVerdictFetching;
  const visuals = getVerdictVisuals(verdict?.verdict);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              Hardware & Cybersecurity Inspector
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live OS Probes
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operating system posture, CPU & memory telemetry, storage capacity, open listening sockets, and holistic safety verdict.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Re-Scan System</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('verdict')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'verdict'
              ? 'border-emerald-600 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>&quot;Is It Safe?&quot; Verdict</span>
        </button>

        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'hardware'
              ? 'border-emerald-600 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4 text-slate-600" />
          <span>Hardware & Diagnostics</span>
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'network'
              ? 'border-emerald-600 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Network className="w-4 h-4 text-slate-600" />
          <span>Open Sockets & Firewall</span>
        </button>

        <button
          onClick={() => setActiveTab('persistence')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'persistence'
              ? 'border-emerald-600 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4 text-slate-600" />
          <span>Autostart & Persistence</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('remote')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'remote'
                ? 'border-emerald-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4 text-slate-600" />
            <span>Access Remote IP Node</span>
          </button>
        )}
      </div>

      {/* TAB 1: "IS IT SAFE?" VERDICT */}
      {activeTab === 'verdict' && (
        <div className="space-y-6">
          {isVerdictLoading || !verdict ? (
            <div className="p-8 bg-white border border-slate-200 rounded-xl animate-pulse space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded" />
              <div className="h-16 w-full bg-slate-100 rounded" />
            </div>
          ) : (
            <>
              {/* Hero Verdict Banner */}
              <div className={`p-6 rounded-xl border ${visuals.banner} flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xs`}>
                <div className="flex items-start gap-4">
                  {visuals.icon}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${visuals.badge}`}>
                        {verdict.verdict}
                      </span>
                      <span className="text-xs text-slate-500">Live Operating System Assessment</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{verdict.plainExplanation}</h2>
                  </div>
                </div>

                <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${visuals.scoreBadge} min-w-[120px]`}>
                  <span className="text-3xl font-black">{verdict.safetyScore}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Safety Score (0–100)</span>
                </div>
              </div>

              {/* Deductions and Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Deductions Box */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Security & Health Exposures
                  </h3>

                  {verdict.deductions.length === 0 ? (
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Zero active penalties. All shields, firewall, and resources are in optimal condition.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {verdict.deductions.map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                          <div className="space-y-0.5 pr-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1.5 py-0.2 rounded bg-slate-200/60">
                              {d.category}
                            </span>
                            <p className="text-slate-800 font-medium">{d.reason}</p>
                          </div>
                          <span className="text-rose-700 font-bold shrink-0">-{d.points} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actionable Recommendations */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Recommended Actions to Stay Protected
                  </h3>

                  <ul className="space-y-2">
                    {verdict.recommendations.map((rec, idx) => (
                      <li key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: HARDWARE & DIAGNOSTICS */}
      {activeTab === 'hardware' && (
        <div className="space-y-6">
          {/* Hardware Source Device Selector Banner */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border ${
                  selectedNodeId === 'local' || !selectedRemoteNode
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}>
                  {selectedNodeId === 'local' || !selectedRemoteNode ? (
                    <Server className="w-5 h-5 shrink-0" />
                  ) : (
                    <Laptop className="w-5 h-5 shrink-0" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Hardware Telemetry Target
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      selectedNodeId === 'local' || !selectedRemoteNode
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    }`}>
                      {selectedNodeId === 'local' || !selectedRemoteNode ? 'Host Machine (Laptop 1)' : 'Remote Fleet Device'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Viewing telemetry for:{' '}
                    <span className="font-semibold text-slate-900">
                      {!isAdmin
                        ? `This Device (${authSession?.device_name || authSession?.user_name || 'My Laptop'})`
                        : selectedNodeId === 'local' || !selectedRemoteNode
                        ? `🖥️ Laptop 1 (Host Server: ${networkData?.primaryIp || '192.168.29.240'})`
                        : `💻 ${selectedRemoteNode.hostname || selectedRemoteNode.assignedUser} (IP: ${selectedRemoteNode.ipAddress})`}
                    </span>
                  </p>
                </div>
              </div>

              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId('local')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                      selectedNodeId === 'local'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Laptop 1 (Host Server)</span>
                  </button>
                  {remoteFleetNodes.map((node: FleetNode) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                        selectedNodeId === node.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>{node.hostname || node.assignedUser || 'Remote Laptop'}</span>
                      <span className="text-[10px] opacity-80 font-mono">({node.ipAddress})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                    📍 Scoped: {authSession?.device_name || authSession?.user_name || 'My Laptop'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Zero-Trust Privacy Guard
                  </span>
                </div>
              )}
            </div>

            {isAdmin && remoteFleetNodes.length === 0 && selectedNodeId === 'local' && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span>
                  💡 <strong>Want to monitor a second laptop?</strong> Run the one-click PowerShell agent on the second laptop:
                </span>
                <code className="text-[11px] font-mono font-bold bg-white px-2 py-1 rounded border border-slate-300 text-slate-900 shrink-0 select-all">
                  irm http://{networkData?.primaryIp || '192.168.29.240'}:3000/api/v1/fleet/agent-script | iex
                </code>
              </div>
            )}
          </div>

          {isHardwareLoading || !hardware ? (
            <div className="p-8 bg-white border border-slate-200 rounded-xl animate-pulse space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded" />
              <div className="h-32 w-full bg-slate-100 rounded" />
            </div>
          ) : (() => {
            const activeDisplayCpu = selectedRemoteNode
              ? {
                  model: selectedRemoteNode.cpuModel || `${selectedRemoteNode.hostname} Multi-Core CPU`,
                  cores: selectedRemoteNode.cpuCores || 4,
                  baseSpeedMHz: selectedRemoteNode.cpuSpeedMHz || 2400,
                  loadPct: selectedRemoteNode.cpuPercent,
                }
              : hardware.cpu;

            const activeDisplayRam = selectedRemoteNode
              ? {
                  usedGB: parseFloat(((selectedRemoteNode.totalRamGB * selectedRemoteNode.ramPercent) / 100).toFixed(1)),
                  totalGB: selectedRemoteNode.totalRamGB,
                  freeGB: selectedRemoteNode.freeRamGB,
                  usedPct: selectedRemoteNode.ramPercent,
                }
              : hardware.ram;

            const activeDisplayStorage =
              selectedRemoteNode && selectedRemoteNode.storageDrives && selectedRemoteNode.storageDrives.length > 0
                ? selectedRemoteNode.storageDrives.map((d: any) => ({
                    drive: d.drive,
                    totalGB: d.totalGB,
                    freeGB: d.freeGB,
                    usedPct: d.usedPct,
                    fileSystem: 'NTFS',
                  }))
                : hardware.storage;

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CPU Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Processor (CPU)</span>
                    <Cpu className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="text-base font-bold text-slate-900 truncate" title={activeDisplayCpu.model}>
                    {activeDisplayCpu.model}
                  </div>
                  <div className="text-xs text-slate-600">
                    {activeDisplayCpu.cores} Physical / Logical Cores &bull; {activeDisplayCpu.baseSpeedMHz} MHz
                  </div>
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Active Workload</span>
                      <span className="font-bold text-slate-900">{activeDisplayCpu.loadPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, activeDisplayCpu.loadPct))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Memory (RAM) Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Memory (RAM)</span>
                    <Activity className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {activeDisplayRam.usedGB} GB used of {activeDisplayRam.totalGB} GB
                  </div>
                  <div className="text-xs text-slate-600">
                    {activeDisplayRam.freeGB} GB Available for application security
                  </div>
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Memory Pressure</span>
                      <span className="font-bold text-slate-900">{activeDisplayRam.usedPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          activeDisplayRam.usedPct > 85 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, activeDisplayRam.usedPct))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* System Uptime & SMART Status */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Device Health</span>
                    <Clock className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="text-base font-bold text-slate-900 truncate">
                    {selectedRemoteNode ? `${selectedRemoteNode.hostname} (Remote Node)` : `${hardware.uptimeHours} Hours Uptime`}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                    <span>{selectedRemoteNode ? 'Operating System:' : 'SMART Disk Health:'}</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 truncate">
                      {selectedRemoteNode ? selectedRemoteNode.os : hardware.smartStatus}
                    </span>
                  </div>
                  <div className="pt-2 text-xs text-slate-500">
                    {selectedRemoteNode ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active App: {selectedRemoteNode.activeForegroundApp || 'explorer.exe'}
                      </span>
                    ) : hardware.deviceErrors.length === 0 ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> All peripheral drivers nominal
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {hardware.deviceErrors.length} device(s) reporting error
                      </span>
                    )}
                  </div>
                </div>

                {/* Storage Partitions */}
                <div className="col-span-1 md:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-slate-900">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-slate-600" />
                      Storage Volumes &amp; Free Space
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeDisplayStorage.map((d: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">Drive {d.drive} ({d.fileSystem})</span>
                          <span className="text-slate-600">{d.freeGB} GB free of {d.totalGB} GB</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              d.usedPct > 90 ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, d.usedPct))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Physical USB Hardware & Connected Peripherals */}
                <div className="col-span-1 md:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-slate-900">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Usb className="w-4 h-4 text-slate-600" />
                      Physical USB Hardware &amp; Connected Peripherals
                    </h3>
                    <span className="text-xs text-slate-500">Mice, Keyboards &amp; Hardware Controllers</span>
                  </div>

                  {selectedRemoteNode ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Remote Endpoint Hardware Shield Active. Process count: <strong>{selectedRemoteNode.activeProcessesCount}</strong></span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">Host IP: {selectedRemoteNode.ipAddress}</span>
                    </div>
                  ) : hardware.usbPeripherals && hardware.usbPeripherals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {hardware.usbPeripherals.map((dev, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5">
                          <div className="p-2 bg-white rounded-md border border-slate-200 text-slate-600 shrink-0">
                            {dev.category === 'Mouse' ? (
                              <Mouse className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Usb className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate" title={dev.name}>
                              {dev.name}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[10px] font-medium">
                                {dev.category}
                              </span>
                              {dev.manufacturer && <span className="truncate">{dev.manufacturer}</span>}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Status: {dev.status} (Hardware Connected)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Standard HID peripherals (Mouse, Keyboard) connected and operational.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: NETWORK & OPEN PORTS */}
      {activeTab === 'network' && (
        <div className="space-y-6">
          {/* Host Network & Live IP Configuration Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  Live Host Network &amp; IP Configuration
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct telemetry from operating system network kernel and active physical adapters.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Online · Connected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Primary IP Card */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active IPv4 Address</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-bold text-slate-900">{networkData?.primaryIp || '192.168.29.240'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (networkData?.primaryIp) {
                        navigator.clipboard.writeText(networkData.primaryIp);
                        setCopiedIp(true);
                        setTimeout(() => setCopiedIp(false), 2000);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Copy IP"
                  >
                    {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Adapter: {networkData?.interfaceName || 'Wi-Fi'}</div>
              </div>

              {/* Gateway Card */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Default Gateway</span>
                <div className="text-sm font-mono font-bold text-slate-900">{networkData?.gateway || '192.168.29.1'}</div>
                <div className="text-[11px] text-slate-500 font-medium">Local Router / Next Hop</div>
              </div>

              {/* Subnet Mask */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subnet Mask &amp; CIDR</span>
                <div className="text-sm font-mono font-bold text-slate-900">{networkData?.subnetMask || '255.255.255.0'}</div>
                <div className="text-[11px] text-slate-500 font-mono font-medium">{networkData?.cidr || '192.168.29.240/24'}</div>
              </div>

              {/* MAC Address */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Physical MAC Address</span>
                <div className="text-sm font-mono font-bold text-slate-900 uppercase">{networkData?.macAddress || '4c:77:cb:be:c2:97'}</div>
                <div className="text-[11px] text-slate-500 font-medium">Hardware Identifier</div>
              </div>
            </div>
          </div>

          {isPostureLoading || !posture ? (
            <div className="p-8 bg-white border border-slate-200 rounded-xl animate-pulse space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded" />
              <div className="h-32 w-full bg-slate-100 rounded" />
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              {/* Firewall Status Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Host Firewall Enforcement</h3>
                    <p className="text-[11px] text-slate-500">Windows Defender Firewall Domain and Public profiles</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  posture.firewall.enabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {posture.firewall.enabled ? 'Firewall Active & Enforced' : 'Firewall Disabled'}
                </span>
              </div>

              {/* Educational Notice: Software Network Sockets vs Physical USB Hardware Ports */}
              <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-950">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-blue-900">
                    Understanding Ports: Virtual Network Sockets vs. Physical USB Hardware Ports
                  </div>
                  <p className="text-blue-800 text-[11px] leading-relaxed">
                    The ports listed below (such as Port 445 SMB or Port 135 RPC) are <strong>virtual software sockets</strong> used by Windows network protocols for network communication over LAN/Wi-Fi. They are completely separate from the <strong>physical USB ports</strong> on your computer (where external hardware like your mouse or keyboard connects). Physical USB devices are safely inspected under the <strong>Hardware &amp; Diagnostics</strong> tab.
                  </p>
                </div>
              </div>

              {/* Ports Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Active Listening Sockets ({posture.listeningPorts.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Inspected via local TCP socket manager</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Port</th>
                        <th className="py-2 px-3">Protocol</th>
                        <th className="py-2 px-3">Bind Address</th>
                        <th className="py-2 px-3">Process PID</th>
                        <th className="py-2 px-3">Exposure Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {posture.listeningPorts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-bold text-slate-900">{p.port}</td>
                          <td className="py-2 px-3 text-slate-600">{p.protocol}</td>
                          <td className="py-2 px-3 text-slate-500">{p.address}</td>
                          <td className="py-2 px-3 text-slate-600">{p.pid}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.risk === 'HIGH'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : p.risk === 'MEDIUM'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {p.risk} RISK
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUTOSTART & PERSISTENCE */}
      {activeTab === 'persistence' && (
        <div className="space-y-6">
          {isPostureLoading || !posture ? (
            <div className="p-8 bg-white border border-slate-200 rounded-xl animate-pulse space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded" />
              <div className="h-32 w-full bg-slate-100 rounded" />
            </div>
          ) : (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    Startup & Persistence Registrations
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registry Run keys inspected to verify no unauthorized programs launch automatically.
                  </p>
                </div>
              </div>

              {posture.persistenceItems.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                  No third-party registry persistence entries detected in current profile.
                </div>
              ) : (
                <div className="space-y-2">
                  {posture.persistenceItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-bold text-slate-900">{item.name}</span>
                        <p className="font-mono text-[11px] text-slate-500 truncate max-w-xl" title={item.targetPath}>
                          {item.targetPath}
                        </p>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                        item.verified
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.verified ? 'Verified System Binary' : 'User Startup Item'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ACCESS REMOTE IP NODE */}
      {activeTab === 'remote' && (
        <div className="space-y-6">
          {/* Target Host Input Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  Agentless Remote IP Node Prober &amp; Security Auditor
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter an IPv4 address, IPv6 address, or LAN hostname to probe its active administrative ports, hardware telemetry reachability, and remote safety score.
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Server className="w-3.5 h-3.5" />
                <span>Agentless Engine Active</span>
              </div>
            </div>

            {/* Input Bar & Presets */}
            <div className="space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProbeRemoteNode();
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={remoteHost}
                    onChange={(e) => setRemoteHost(e.target.value)}
                    placeholder="Enter Target IP (e.g. 192.168.29.1, 192.168.29.240, 127.0.0.1)"
                    className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProbing || !remoteHost.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-2xs shrink-0"
                >
                  <Radio className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                  <span>{isProbing ? 'Probing System...' : 'Scan & Access Node'}</span>
                </button>
              </form>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setRemoteHost('127.0.0.1');
                    handleProbeRemoteNode('127.0.0.1');
                  }}
                  className="px-2 py-0.5 text-[11px] font-mono text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
                >
                  Loopback (127.0.0.1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const gw = networkData?.gateway || '192.168.29.1';
                    setRemoteHost(gw);
                    handleProbeRemoteNode(gw);
                  }}
                  className="px-2 py-0.5 text-[11px] font-mono text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
                >
                  Router Gateway ({networkData?.gateway || '192.168.29.1'})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const myIp = networkData?.primaryIp || '192.168.29.240';
                    setRemoteHost(myIp);
                    handleProbeRemoteNode(myIp);
                  }}
                  className="px-2 py-0.5 text-[11px] font-mono text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
                >
                  Local Host ({networkData?.primaryIp || '192.168.29.240'})
                </button>
              </div>
            </div>

            {probeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{probeError}</span>
              </div>
            )}
          </div>

          {/* Results Display */}
          {remoteResult && (
            <div className="space-y-6">
              {/* Verdict & Host Identity Hero */}
              <div className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs ${
                remoteResult.verdict === 'SECURE & HEALTHY'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : remoteResult.verdict === 'ACTION RECOMMENDED'
                  ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                  : 'bg-rose-50/90 border-rose-200 text-rose-950'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-900">
                      {remoteResult.targetHost}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                      {remoteResult.osFingerprint}
                    </span>
                    {remoteResult.isReachable ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        Reachable ({remoteResult.latencyMs} ms)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                        Host Unreachable / Silent
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    {remoteResult.isReachable
                      ? `Discovered ${remoteResult.openPorts.length} active administrative service(s)`
                      : 'No response on standard administrative or hardware ports'}
                  </h4>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/90 border border-slate-200 min-w-[110px] shadow-2xs">
                  <span className="text-2xl font-black text-slate-900">{remoteResult.safetyScore}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Remote Score</span>
                </div>
              </div>

              {/* Open Ports & Services Table */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Probed Services &amp; Ports ({remoteResult.openPorts.length} Open / {remoteResult.closedPortsCount} Closed)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    Scanned at {new Date(remoteResult.scanTimestampUtc).toLocaleTimeString()}
                  </span>
                </div>

                {remoteResult.openPorts.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                    Zero open listening ports detected on target host. The remote system is either powered off, blocking all inbound traffic, or running on non-standard ports.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Port</th>
                          <th className="py-2 px-3">Service Name</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3">Latency</th>
                          <th className="py-2 px-3">Exposure Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {remoteResult.openPorts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-bold text-slate-900">{p.port}</td>
                            <td className="py-2 px-3 font-semibold text-emerald-700">{p.serviceName}</td>
                            <td className="py-2 px-3 text-slate-600 font-sans">{p.description}</td>
                            <td className="py-2 px-3 text-slate-500">{p.latencyMs ? `${p.latencyMs} ms` : 'Active'}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.risk === 'HIGH'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : p.risk === 'MEDIUM'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {p.risk} RISK
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Actionable Recommendations for Remote Host */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Remote Node Security &amp; Access Guidance
                </h4>
                <ul className="space-y-2">
                  {remoteResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

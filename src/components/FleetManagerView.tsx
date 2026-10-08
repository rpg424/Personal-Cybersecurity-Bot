import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Laptop,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Server,
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Wifi,
  Radio,
  FileSearch,
  ExternalLink,
  Info,
  X,
  Search,
  ChevronRight,
  FileWarning,
  Folder,
  Copy,
  Check,
  Terminal,
  Link as LinkIcon,
} from 'lucide-react';
import { api } from '../api/client';
import { FleetNode, FleetSummary, ClientTransparencyStatus } from '../types/security';

export const FleetManagerView: React.FC = () => {
  const qc = useQueryClient();
  const [selectedNode, setSelectedNode] = useState<FleetNode | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isTransparencyModalOpen, setIsTransparencyModalOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [copiedPairingLink, setCopiedPairingLink] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Agent script query for one-click pairing
  const { data: agentScriptData } = useQuery({
    queryKey: ['fleet_agent_script'],
    queryFn: api.getAgentScript,
  });

  const pairingLink = typeof window !== 'undefined' ? `${window.location.origin}/join` : 'http://localhost:3000/join';

  const copyPairingLink = () => {
    navigator.clipboard.writeText(pairingLink);
    setCopiedPairingLink(true);
    setTimeout(() => setCopiedPairingLink(false), 2500);
  };

  const copyScriptCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Enrollment Form State
  const [enrollIp, setEnrollIp] = useState('');
  const [enrollHostname, setEnrollHostname] = useState('');
  const [enrollUser, setEnrollUser] = useState('');
  const [enrollAcknowledged, setEnrollAcknowledged] = useState(true);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Fleet nodes query
  const {
    data: fleetData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<{ nodes: FleetNode[]; summary: FleetSummary }>({
    queryKey: ['fleet_nodes'],
    queryFn: api.getFleetNodes,
    refetchInterval: 8000,
  });

  // Client Transparency Status query
  const { data: transparencyData } = useQuery<ClientTransparencyStatus>({
    queryKey: ['client_transparency_status'],
    queryFn: api.getClientTransparencyStatus,
  });

  // Enroll Mutation
  const enrollMutation = useMutation({
    mutationFn: api.enrollFleetNode,
    onSuccess: () => {
      setIsEnrollModalOpen(false);
      setEnrollIp('');
      setEnrollHostname('');
      setEnrollUser('');
      setEnrollError(null);
      qc.invalidateQueries({ queryKey: ['fleet_nodes'] });
    },
    onError: (err: any) => {
      setEnrollError(err.message || 'Failed to enroll remote laptop.');
    },
  });

  // Scan Mutation
  const scanMutation = useMutation({
    mutationFn: (nodeId: string) => api.scanFleetNode(nodeId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['fleet_nodes'] });
      if (selectedNode && selectedNode.id === data.node.id) {
        setSelectedNode(data.node);
      }
    },
  });

  // Delete Node Mutation
  const deleteMutation = useMutation({
    mutationFn: (nodeId: string) => api.deleteFleetNode(nodeId),
    onSuccess: () => {
      setSelectedNode(null);
      qc.invalidateQueries({ queryKey: ['fleet_nodes'] });
    },
  });

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollIp || !enrollUser) {
      setEnrollError('IP address and assigned user name are required.');
      return;
    }
    if (!enrollAcknowledged) {
      setEnrollError('You must acknowledge the Persistent User Transparency policy before enrolling a device.');
      return;
    }
    enrollMutation.mutate({
      ipAddress: enrollIp.trim(),
      hostname: enrollHostname.trim() || undefined,
      assignedUser: enrollUser.trim(),
      userAcknowledged: true,
    });
  };

  const nodes = fleetData?.nodes || [];
  const summary = fleetData?.summary;

  const filteredNodes = nodes.filter(
    (n) =>
      n.hostname.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.assignedUser.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.ipAddress.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'SECURE & HEALTHY':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
        };
      case 'ACTION RECOMMENDED':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
        };
      case 'CRITICAL RISK':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          icon: <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
        };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              Multi-Node Fleet & Remote Laptop Cockpit
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              One Web Console · Multi-User
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Single-dashboard administrative access to multiple remote laptops and endpoints simultaneously. 
            All monitored devices operate transparently with persistent user awareness and no arbitrary time restrictions.
          </p>
        </div>

        {/* Global Fleet Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={copyPairingLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
            title="Copy pairing link for second user's laptop (http://<ip>:3000/join)"
          >
            {copiedPairingLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />}
            {copiedPairingLink ? 'Pairing Link Copied!' : 'Copy Pairing Link (/join)'}
          </button>

          <button
            onClick={() => setIsScriptModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs"
            title="Generate one-click PowerShell agent script for deep CPU/RAM/file scan"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-600" />
            Agent Script
          </button>

          <button
            onClick={() => setIsTransparencyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            Monitored User Notice
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>

          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Enroll Remote Laptop
          </button>
        </div>
      </div>

      {/* Fleet Summary KPI Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Laptops</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-1.5">
            {summary?.totalNodes ?? nodes.length}
            <span className="text-[11px] font-medium text-emerald-600 font-sans">Enrolled</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Online & Active</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 flex items-baseline gap-1.5">
            {summary?.onlineNodes ?? nodes.filter((n) => n.status === 'ONLINE').length}
            <span className="text-[11px] font-medium text-slate-500 font-sans">Live</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fleet Safety</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-1.5">
            {summary?.healthyNodes ?? nodes.filter((n) => n.safetyVerdict === 'SECURE & HEALTHY').length}
            <span className="text-[11px] font-medium text-emerald-600 font-sans">Protected</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Harmful Files</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-1.5">
            {summary?.totalHarmfulFiles ?? 0}
            <span className="text-[11px] font-medium text-slate-500 font-sans">Detected</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg CPU Load</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-1.5">
            {summary?.avgCpuPercent ?? 12}%
            <span className="text-[11px] font-medium text-slate-500 font-sans">Nominal</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Subnet Devices</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 flex items-baseline gap-1.5">
            {summary?.totalConnectedDevices ?? 4}
            <span className="text-[11px] font-medium text-slate-500 font-sans">Peers</span>
          </div>
        </div>
      </div>

      {/* Fleet Filter Bar */}
      <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search laptop hostname, assigned user, or IP address..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredNodes.length} of {nodes.length} enrolled systems
        </div>
      </div>

      {/* Fleet Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredNodes.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white border border-slate-200 rounded-xl shadow-xs">
            <Server className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            {searchFilter ? (
              <>
                <p className="text-sm font-semibold text-slate-700">No nodes match "{searchFilter}"</p>
                <p className="text-xs text-slate-500 mt-1">Try a different hostname, user, or IP address.</p>
                <button
                  onClick={() => setSearchFilter('')}
                  className="mt-3 text-xs text-emerald-700 font-semibold hover:underline"
                >
                  Clear filter
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700">No remote laptops enrolled yet</p>
                <p className="text-xs text-slate-500 mt-1">Click "Enroll Remote Laptop" to add a device to fleet management.</p>
              </>
            )}
          </div>
        )}
        {filteredNodes.map((node) => {
          const vStyle = getVerdictStyle(node.safetyVerdict);
          const isScanningThisNode = scanMutation.isPending && scanMutation.variables === node.id;
          const heartbeatAgeSec = (Date.now() - new Date(node.lastHeartbeatUtc).getTime()) / 1000;
          const isStale = !node.isLocal && heartbeatAgeSec > 300;

          return (
            <div
              key={node.id}
              className={`bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                node.isLocal ? 'border-emerald-300 ring-1 ring-emerald-200/60' : 'border-slate-200'
              } ${node.status === 'OFFLINE' ? 'opacity-60' : ''}`}
            >
              <div>
                {/* Node Title & Tags */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-slate-700 shrink-0" />
                      <h3 className="font-bold text-sm text-slate-900 truncate" title={node.hostname}>
                        {node.hostname}
                      </h3>
                      {node.isLocal && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800">
                          This Host
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      User: <strong className="text-slate-800">{node.assignedUser}</strong>
                    </div>
                  </div>

                  {/* Safety Verdict Pill */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${vStyle.bg}`}
                  >
                    {vStyle.icon}
                    <span>{node.safetyScore}/100</span>
                  </span>
                </div>

                {/* Network & Transparency Badges */}
                <div className="mt-3.5 flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-slate-500" />
                    {node.ipAddress}
                  </span>
                  {/* Heartbeat status badge */}
                  {node.status === 'OFFLINE' ? (
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-300 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      Offline
                    </span>
                  ) : node.status === 'DEGRADED' || isStale ? (
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      No heartbeat ({Math.floor(heartbeatAgeSec / 60)}m ago)
                    </span>
                  ) : (
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-medium">
                      🛡️ Transparent · No Time Limit
                    </span>
                  )}
                </div>

                {/* Hardware Telemetry Progress Bars */}
                <div className="mt-4 space-y-2.5 pt-3 border-t border-slate-100">
                  {/* CPU Meter */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-slate-400" /> CPU Load
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {node.isLocal || node.cpuPercent > 0 ? `${node.cpuPercent}%` : 'Agentless (TCP Probe)'}
                      </span>
                    </div>
                    {node.isLocal || node.cpuPercent > 0 ? (
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            node.cpuPercent > 80 ? 'bg-rose-500' : node.cpuPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, node.cpuPercent))}%` }}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* RAM Meter */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-slate-400" /> Physical RAM
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {node.totalRamGB > 0
                          ? `${node.ramPercent}% (${node.freeRamGB} GB free of ${node.totalRamGB} GB)`
                          : 'Agentless (TCP Probe)'}
                      </span>
                    </div>
                    {node.totalRamGB > 0 ? (
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            node.ramPercent > 85 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, node.ramPercent))}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400">Install bot on remote laptop to stream live OS telemetry.</p>
                    )}
                  </div>
                </div>

                {/* Live Activity & Threat Scanner Results */}
                <div className="mt-3.5 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Live Active App:</span>
                    <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      {node.isLocal || node.status === 'ONLINE' ? node.activeForegroundApp : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Harmful Files / Malware:</span>
                    <span
                      className={`font-semibold ${
                        node.harmfulFilesDetected > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700'
                      }`}
                    >
                      {node.harmfulFilesDetected === 0
                        ? '🛡️ 0 Threats Detected'
                        : `⚠️ ${node.harmfulFilesDetected} Harmful File(s)`}
                    </span>
                  </div>

                  {/* Exact Harmful Files / Threat Callout */}
                  {node.harmfulThreats && node.harmfulThreats.length > 0 && (
                    <div className="mt-2 p-2.5 bg-rose-50/90 border border-rose-200 rounded-lg text-xs space-y-2">
                      <div className="flex items-center justify-between text-rose-950 font-bold">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          Exact Threats Detected ({node.harmfulThreats.length}):
                        </span>
                        <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-rose-200/80 text-rose-900 border border-rose-300">
                          Action Required
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {node.harmfulThreats.map((threat) => (
                          <div
                            key={threat.id}
                            className="bg-white border border-rose-200 rounded p-2 text-[11px] space-y-1 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-slate-900 truncate" title={threat.title}>
                                {threat.fileName || threat.title}
                              </span>
                              <span className="px-1 py-0.2 text-[9px] font-bold uppercase rounded bg-rose-100 text-rose-800 shrink-0">
                                {threat.severity}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-700 break-all bg-slate-50 p-1 rounded border border-slate-200" title={threat.filePath}>
                              📁 Path: {threat.filePath}
                            </div>
                            {threat.processName && (
                              <div className="text-[10px] text-slate-600">
                                ⚡ Process: <strong className="font-mono text-slate-900">{threat.processName}</strong> {threat.pid ? `(PID: ${threat.pid})` : ''}
                              </div>
                            )}
                            <div className="text-[10px] text-rose-900 font-medium">
                              ⚠️ {threat.whyRisky}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {node.cpuModel && (
                    <div className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-slate-200">
                      <span className="text-slate-500">CPU Hardware:</span>
                      <span className="font-mono text-slate-800 font-semibold truncate max-w-[170px]" title={node.cpuModel}>
                        {node.cpuModel}
                      </span>
                    </div>
                  )}

                  {node.isAgentless ? (
                    <div className="mt-2.5 p-2 bg-amber-50/80 border border-amber-200 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-amber-950 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          External IP Probe (Agentless)
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">
                          Ports Probed
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900 leading-snug">
                        External ingress checked ({node.openPorts && node.openPorts.length > 0 ? node.openPorts.map((p) => `Port ${p.port} ${p.serviceName}`).join(', ') : 'Port 1 TCPMUX & standard ports'}). Send pairing link to unlock deep CPU chips & file scan:
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          onClick={copyPairingLink}
                          className="text-[10px] font-bold text-amber-950 bg-white hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Copy className="w-3 h-3" /> Copy Pairing Link
                        </button>
                        <button
                          onClick={() => setIsScriptModalOpen(true)}
                          className="text-[10px] font-bold text-amber-950 bg-white hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Terminal className="w-3 h-3" /> Script
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-emerald-900 bg-emerald-50/60 p-2 rounded border border-emerald-200 flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Deep Telemetry Active
                      </span>
                      <span className="text-[10px] text-slate-500">Kernel & File Scan Live</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Connected Subnet Laptops:</span>
                    <span className="text-slate-800 font-medium">
                      {node.connectedLaptopsCount} devices on network
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedNode(node)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-colors"
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  View Details
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => scanMutation.mutate(node.id)}
                    disabled={isScanningThisNode}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isScanningThisNode ? 'animate-spin' : ''}`} />
                    {isScanningThisNode ? 'Scanning...' : 'Scan Now'}
                  </button>

                  {!node.isLocal && (
                    <button
                      onClick={() => {
                        if (confirm(`Unenroll ${node.hostname} (${node.assignedUser}) from fleet management?`)) {
                          deleteMutation.mutate(node.id);
                        }
                      }}
                      title="Unenroll laptop"
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Node Details Inspection Modal */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-emerald-600" />
                  {selectedNode.hostname} Telemetry & Posture
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned User: <strong className="text-slate-800">{selectedNode.assignedUser}</strong> · IP: {selectedNode.ipAddress}
                </p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Operating System and Specs */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Operating System:</span>
                <div className="font-semibold text-slate-900 mt-0.5">{selectedNode.os}</div>
              </div>
              <div>
                <span className="text-slate-500">Safety Verdict:</span>
                <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {selectedNode.safetyVerdict} ({selectedNode.safetyScore}/100)
                </div>
              </div>
              <div>
                <span className="text-slate-500">Monitoring Policy:</span>
                <div className="font-semibold text-slate-900 mt-0.5">Continuous Protection (No time limit)</div>
              </div>
              <div>
                <span className="text-slate-500">Last Telemetry Heartbeat:</span>
                <div className="font-mono text-slate-700 mt-0.5">
                  {new Date(selectedNode.lastHeartbeatUtc).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Full Hardware Inventory & Live Specs */}
            <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  Full Physical Hardware & Memory Inventory
                </h4>
                {selectedNode.isAgentless ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    External IP Probed (Agentless)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Kernel Telemetry Active
                  </span>
                )}
              </div>

              {/* CPU Hardware Specs */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-slate-600" />
                    Central Processing Unit (CPU)
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">
                    {selectedNode.cpuPercent > 0 ? `${selectedNode.cpuPercent}% Live Load` : 'Agentless'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                  <div>
                    <span className="text-slate-500">Processor Model:</span>
                    <div className="font-mono font-semibold text-slate-900 truncate" title={selectedNode.cpuModel}>
                      {selectedNode.cpuModel || (selectedNode.isLocal ? 'Host Physical Processor' : 'Generic x64 Processor')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Cores / Threads:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedNode.cpuCores ? `${selectedNode.cpuCores} Physical/Logical Cores` : 'Multi-Core'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Base Clock Speed:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedNode.cpuSpeedMHz ? `${selectedNode.cpuSpeedMHz} MHz` : 'Dynamic Clock'}
                    </div>
                  </div>
                </div>
              </div>

              {/* RAM Hardware Specs */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-600" />
                    Physical Random Access Memory (RAM)
                  </span>
                  <span className="font-mono text-slate-700 font-bold">
                    {selectedNode.totalRamGB > 0 ? `${selectedNode.ramPercent}% In Use` : 'Agentless'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                  <div>
                    <span className="text-slate-500">Total Installed RAM:</span>
                    <div className="font-bold text-slate-900">
                      {selectedNode.totalRamGB > 0 ? `${selectedNode.totalRamGB} GB Physical RAM` : 'Agentless (Probing)'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">RAM In Use:</span>
                    <div className="font-bold text-slate-900">
                      {selectedNode.totalRamGB > 0
                        ? `${((selectedNode.totalRamGB * selectedNode.ramPercent) / 100).toFixed(1)} GB (${selectedNode.ramPercent}%)`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Free Available RAM:</span>
                    <div className="font-bold text-emerald-700">
                      {selectedNode.freeRamGB > 0 ? `${selectedNode.freeRamGB} GB Free` : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Storage Drives Inventory */}
              {selectedNode.storageDrives && selectedNode.storageDrives.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-slate-600" />
                    Storage Disks & Partitions ({selectedNode.storageDrives.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedNode.storageDrives.map((d, i) => (
                      <div key={i} className="bg-white p-2 rounded border border-slate-200 text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>Drive {d.drive}</span>
                          <span className="text-slate-500">{d.usedPct}% Used</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${d.usedPct > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${d.usedPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Total: {d.totalGB} GB</span>
                          <span className="text-emerald-700 font-medium">Free: {d.freeGB} GB</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agentless Device Pairing Notice */}
              {selectedNode.isAgentless && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-2">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    Why are CPU chip model and files not loaded yet?
                  </div>
                  <p className="text-amber-900 text-[11px] leading-relaxed">
                    External IP network probing tests open ports (e.g. Port 1 TCPMUX) and latency, but standard network firewalls block reading physical CPU chips, RAM slots, or private files across the network without user authorization on the laptop.
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={copyPairingLink}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-amber-300 rounded text-amber-950 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Copy className="w-3 h-3" /> Copy Web Pairing Link (/join)
                    </button>
                    <button
                      onClick={() => setIsScriptModalOpen(true)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Terminal className="w-3 h-3" /> View PowerShell Script
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Exact Harmful Files & Detected Threats Section */}
            {selectedNode.harmfulThreats && selectedNode.harmfulThreats.length > 0 ? (
              <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Exact Detected Threats & Harmful Files ({selectedNode.harmfulThreats.length})
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300">
                    Active Harmful Threat
                  </span>
                </div>
                <div className="space-y-2.5">
                  {selectedNode.harmfulThreats.map((threat) => (
                    <div
                      key={threat.id}
                      className="bg-white border border-rose-200 rounded-lg p-3.5 space-y-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <FileWarning className="w-4 h-4 text-rose-600 shrink-0" />
                            {threat.fileName}
                          </div>
                          <div className="text-xs text-rose-800 font-semibold mt-0.5">
                            {threat.title} · <span className="font-mono text-[11px] text-slate-600">{threat.threatType}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          {threat.severity}
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded p-2 font-mono text-[11px] text-slate-800 break-all">
                        <strong className="text-slate-900">Exact File Path:</strong> {threat.filePath}
                      </div>

                      {threat.processName && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
                          <div>
                            <span className="text-slate-500">Offending Process:</span>
                            <div className="font-bold text-slate-900 font-mono">{threat.processName}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Process ID (PID):</span>
                            <div className="font-bold text-slate-900 font-mono">{threat.pid || 'In-Memory volatile'}</div>
                          </div>
                        </div>
                      )}

                      {threat.commandLine && (
                        <div className="text-[10px] font-mono text-slate-600 break-all bg-slate-100/70 p-1.5 rounded">
                          <strong>Command Line:</strong> {threat.commandLine}
                        </div>
                      )}

                      {threat.sha256 && (
                        <div className="text-[10px] text-slate-500 font-mono break-all">
                          SHA-256 Hash: {threat.sha256}
                        </div>
                      )}

                      <div className="text-xs text-rose-950 bg-rose-50/80 p-2 rounded border border-rose-100">
                        <strong>Why It's Harmful / Risky:</strong> {threat.whyRisky}
                      </div>

                      <div className="text-xs text-emerald-950 bg-emerald-50/80 p-2 rounded border border-emerald-100">
                        <strong>Recommended Defensive Action:</strong> {threat.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>No harmful files, trojans, or malware detected on this system.</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200">
                  Clean & Protected
                </span>
              </div>
            )}

            {/* Listening Ports / Services */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Verified Listening Ports & Services ({selectedNode.openPorts?.length || 0})
                </h4>
                <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Virtual Network Sockets (TCP/IP) · Not Physical USB Slots
                </span>
              </div>
              <div className="space-y-1.5">
                {selectedNode.openPorts && selectedNode.openPorts.length > 0 ? (
                  selectedNode.openPorts.map((p) => (
                    <div
                      key={p.port}
                      className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-slate-900 shrink-0">Port {p.port}</span>
                        <span className="font-semibold text-slate-800 truncate">
                          {p.serviceName}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded shrink-0 ${
                            p.risk === 'HIGH'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : p.risk === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {p.risk} Risk
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 text-right shrink-0 max-w-xs truncate" title={p.description}>
                        {p.description}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded">
                    No exposed public ports found. System is in stealth mode.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Node Activity Log */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Recent Security & Telemetry Events
              </h4>
              <div className="space-y-1.5 text-xs">
                {selectedNode.recentActivity && selectedNode.recentActivity.length > 0 ? (
                  selectedNode.recentActivity.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-slate-50 border border-slate-200 rounded flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-800">{act.event}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(act.timestampUtc).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded">
                    No recent alert incidents.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => scanMutation.mutate(selectedNode.id)}
                disabled={scanMutation.isPending}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                {scanMutation.isPending ? 'Scanning...' : 'Run Security Scan'}
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Remote Laptop Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Enroll Remote Laptop / IP Node
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add another user's laptop (located on LAN, VPN, or 1 km remote connection) into fleet management.
                </p>
              </div>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {enrollError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            <form onSubmit={handleEnrollSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remote IP Address or Hostname <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={enrollIp}
                  onChange={(e) => setEnrollIp(e.target.value)}
                  placeholder="e.g. 192.168.29.105 or my-laptop.local"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned User / Laptop Owner <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={enrollUser}
                  onChange={(e) => setEnrollUser(e.target.value)}
                  placeholder="e.g. Second User (Alice - Finance Laptop)"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Device Hostname (Optional)
                </label>
                <input
                  type="text"
                  value={enrollHostname}
                  onChange={(e) => setEnrollHostname(e.target.value)}
                  placeholder="e.g. THINKPAD-X1-CARBON"
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrollAcknowledged}
                    onChange={(e) => setEnrollAcknowledged(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-600">
                    <strong>Persistent User Transparency:</strong> The remote user is notified that their device is enrolled. Monitoring is continuous (no arbitrary time limits) with zero private surveillance.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollMutation.isPending}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shadow-2xs disabled:opacity-50"
                >
                  {enrollMutation.isPending ? 'Probing & Enrolling...' : 'Enroll Laptop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monitored User Transparency Modal */}
      {isTransparencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Transparent Monitored Device Notice
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This is the persistent verification badge visible on all enrolled laptops.
                </p>
              </div>
              <button
                onClick={() => setIsTransparencyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-2">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                🛡️ Managed Endpoint · Transparent Protection Active
              </div>
              <p className="text-emerald-900 leading-relaxed">
                {transparencyData?.transparencyNotice ||
                  'This device is actively enrolled in Enterprise Endpoint Protection. Telemetry is shared with the administrator for threat defense.'}
              </p>
              <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                Policy Duration: Continuous Enterprise Defense (No arbitrary time limit).
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Authorized Telemetry Transmitted:
                </h4>
                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                  <li>Hardware Health (CPU Load %, Free RAM, Storage Space)</li>
                  <li>Active Foreground Application Name (e.g. chrome.exe)</li>
                  <li>Harmful File & Malware Scans</li>
                  <li>Subnet Device Count & Firewall State</li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Privacy Guarantees (Zero Covert Surveillance):
                </h4>
                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                  <li>NO Keystroke Logging or Password Capture</li>
                  <li>NO Screen Recording or Webcam Access</li>
                  <li>NO Personal Email or Document Inspection</li>
                  <li>Encrypted Audit Log on Local Host</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsTransparencyModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
              >
                Understood & Verified
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Click PowerShell Agent Script Modal */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  One-Click PowerShell Telemetry & File Scanner
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Run on the second user's laptop to stream exact CPU model, physical RAM chips, and deep filesystem malware scan.
                </p>
              </div>
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Command to run in Windows PowerShell on the second user's laptop:
              </label>
              <div className="bg-slate-900 rounded-lg p-3 space-y-2 font-mono text-xs text-slate-200">
                <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Terminal className="w-3 h-3 text-emerald-400" />
                    Windows PowerShell
                  </span>
                  <button
                    onClick={() => copyScriptCmd(agentScriptData?.powershellOneLiner || `irm ${pairingLink.replace('/join', '')}/api/v1/fleet/agent-script/raw | iex`)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] transition-colors"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedScript ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="text-emerald-400 break-all select-all py-1">
                  {agentScriptData?.powershellOneLiner || `irm ${pairingLink.replace('/join', '')}/api/v1/fleet/agent-script/raw | iex`}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-800">What this script safely checks:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li>Queries Win32_Processor for physical CPU model and core count.</li>
                <li>Queries Win32_OperatingSystem for exact physical RAM GB and free memory.</li>
                <li>Inventories physical drives and free storage gigabytes.</li>
                <li>Conducts a malware & harmful file scan of Downloads and Temp folders.</li>
                <li>Streams telemetry directly to this dashboard with zero keystroke logging.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

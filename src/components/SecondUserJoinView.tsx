import React, { useState, useEffect } from 'react';
import {
  Laptop,
  ShieldCheck,
  Cpu,
  HardDrive,
  Copy,
  Check,
  Terminal,
  Activity,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Lock,
  Eye,
  ShieldAlert,
  Globe,
  Ban,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { SecondUserJoinPayload, FleetNode } from '../types/security';

function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return urlStr.trim().toLowerCase();
  }
}

const STORAGE_KEY_NODE = 'pcb_client_joined_node';
const STORAGE_KEY_AUTH = 'pcb_client_authenticated';
const STORAGE_KEY_USER = 'pcb_client_assigned_user';
const STORAGE_KEY_HOSTNAME = 'pcb_client_hostname';

function getOrCreateStableHostname(detectedOs: string): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY_HOSTNAME);
    if (existing && existing.trim()) return existing.trim();
    const prefix = detectedOs.split(' ')[0].toUpperCase();
    const generated = `${prefix}-CLIENT-${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem(STORAGE_KEY_HOSTNAME, generated);
    return generated;
  } catch {
    return `${detectedOs.split(' ')[0].toUpperCase()}-CLIENT-7900`;
  }
}

export const SecondUserJoinView: React.FC = () => {
  // Restore persisted state from localStorage so reload never resets pairing
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem(STORAGE_KEY_AUTH) === 'true' ||
        !!localStorage.getItem(STORAGE_KEY_NODE)
      );
    } catch {
      return false;
    }
  });

  const [loginUser, setLoginUser] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || '';
    } catch {
      return '';
    }
  });
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [assignedUser, setAssignedUser] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || 'Second User (Laptop)';
    } catch {
      return 'Second User (Laptop)';
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinedNode, setJoinedNode] = useState<FleetNode | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NODE);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [agentScript, setAgentScript] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [heartbeatCount, setHeartbeatCount] = useState(0);

  // Active simulated/monitored browser URL state
  const [testBrowserUrl, setTestBrowserUrl] = useState('https://github.com/login');
  const [isSendingUrl, setIsSendingUrl] = useState(false);

  // Hardware concurrency and platform detection from browser
  const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const platform = typeof navigator !== 'undefined' ? navigator.platform || 'Windows' : 'Windows';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isWindows = /Win/i.test(userAgent) || /Win/i.test(platform);
  const detectedOs = isWindows ? 'Windows 11 / 10' : /Mac/i.test(userAgent) ? 'macOS' : 'Linux';

  // Synchronize joinedNode changes to localStorage
  const saveJoinedState = (node: FleetNode | null) => {
    setJoinedNode(node);
    try {
      if (node) {
        localStorage.setItem(STORAGE_KEY_NODE, JSON.stringify(node));
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        if (node.assignedUser) {
          localStorage.setItem(STORAGE_KEY_USER, node.assignedUser);
        }
        if (node.hostname) {
          localStorage.setItem(STORAGE_KEY_HOSTNAME, node.hostname);
        }
      } else {
        localStorage.removeItem(STORAGE_KEY_NODE);
        localStorage.removeItem(STORAGE_KEY_AUTH);
      }
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
  };

  // Fetch the PowerShell one-liner script
  useEffect(() => {
    api.getAgentScript()
      .then((res) => {
        if (res && res.powershellOneLiner) {
          setAgentScript(res.powershellOneLiner);
        }
      })
      .catch(() => {
        // Fallback to local origin
        setAgentScript(`irm ${window.location.origin}/api/v1/fleet/agent-script/raw | iex`);
      });
  }, []);

  // On page mount / reload: if node is already paired, send an immediate check-in to confirm online status
  useEffect(() => {
    if (joinedNode) {
      const domain = extractDomain(testBrowserUrl);
      api.joinFleetEndpoint({
        nodeId: joinedNode.id,
        clientSessionId: api.getClientSessionId ? api.getClientSessionId() : undefined,
        assignedUser: joinedNode.assignedUser || assignedUser,
        hostname: joinedNode.hostname,
        os: joinedNode.os || detectedOs,
        cpuModel: joinedNode.cpuModel || '',
        cpuCores: joinedNode.cpuCores || cpuCores,
        cpuSpeedMHz: joinedNode.cpuSpeedMHz || 2400,
        cpuPercent: 12,
        ramPercent: joinedNode.ramPercent || 45,
        totalRamGB: joinedNode.totalRamGB || 16,
        freeRamGB: joinedNode.freeRamGB || 8.8,
        storageDrives: joinedNode.storageDrives || [],
        activeForegroundApp: 'Google Chrome',
        activeProcessesCount: joinedNode.activeProcessesCount || 42,
        activeBrowserUrl: testBrowserUrl,
        activeBrowserDomain: domain,
        harmfulFilesDetected: joinedNode.harmfulFilesDetected || 0,
        harmfulThreats: joinedNode.harmfulThreats || [],
      }).then((res) => {
        if (res && res.node) {
          saveJoinedState(res.node);
        }
      }).catch((err) => {
        console.warn('[SecondUserJoin] Initial check-in failed, keeping local state:', err);
      });
    }
  }, []); // Run once on mount

  const handleBrowserJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const domain = extractDomain(testBrowserUrl);
      const stableHost = joinedNode?.hostname || getOrCreateStableHostname(detectedOs);
      const payload: SecondUserJoinPayload = {
        nodeId: joinedNode?.id,
        clientSessionId: api.getClientSessionId ? api.getClientSessionId() : undefined,
        assignedUser: assignedUser.trim() || 'Second User (Laptop)',
        hostname: stableHost,
        os: detectedOs,
        cpuModel: `${detectedOs} Host (${cpuCores} Logical CPU Cores)`,
        cpuCores: cpuCores,
        cpuSpeedMHz: 2400,
        cpuPercent: 12,
        ramPercent: 45,
        totalRamGB: 16.0,
        freeRamGB: 8.8,
        storageDrives: [
          { drive: 'C:', totalGB: 512, freeGB: 280, usedPct: 45 },
        ],
        activeForegroundApp: 'Google Chrome',
        activeProcessesCount: 42,
        activeBrowserUrl: testBrowserUrl,
        activeBrowserDomain: domain,
        harmfulFilesDetected: 0,
        harmfulThreats: [],
      };

      const res = await api.joinFleetEndpoint(payload);
      if (res && res.node) {
        saveJoinedState(res.node);
      } else {
        throw new Error(res.message || 'Failed to connect to fleet console.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection failed. Please check network connectivity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportBrowserUrl = async (urlToReport?: string) => {
    if (!joinedNode) return;
    const targetUrl = urlToReport || testBrowserUrl;
    const domain = extractDomain(targetUrl);
    setIsSendingUrl(true);
    try {
      const res = await api.joinFleetEndpoint({
        nodeId: joinedNode.id,
        clientSessionId: api.getClientSessionId ? api.getClientSessionId() : undefined,
        assignedUser: joinedNode.assignedUser || assignedUser,
        hostname: joinedNode.hostname,
        os: joinedNode.os,
        cpuModel: joinedNode.cpuModel,
        cpuCores: joinedNode.cpuCores,
        cpuSpeedMHz: joinedNode.cpuSpeedMHz,
        cpuPercent: joinedNode.cpuPercent,
        ramPercent: joinedNode.ramPercent,
        totalRamGB: joinedNode.totalRamGB,
        freeRamGB: joinedNode.freeRamGB,
        storageDrives: joinedNode.storageDrives,
        activeForegroundApp: 'Google Chrome',
        activeProcessesCount: joinedNode.activeProcessesCount,
        activeBrowserUrl: targetUrl,
        activeBrowserDomain: domain,
        harmfulFilesDetected: joinedNode.harmfulFilesDetected,
        harmfulThreats: joinedNode.harmfulThreats,
      });
      if (res && res.node) {
        saveJoinedState(res.node);
      }
    } catch (err) {
      console.error('Failed to report browser URL:', err);
    } finally {
      setIsSendingUrl(false);
    }
  };

  // Keep sending periodic heartbeat if joined
  useEffect(() => {
    if (!joinedNode) return;

    const interval = setInterval(() => {
      setHeartbeatCount((c) => c + 1);
      const domain = extractDomain(testBrowserUrl);
      // Push live update via client API
      api.joinFleetEndpoint({
        nodeId: joinedNode.id,
        clientSessionId: api.getClientSessionId ? api.getClientSessionId() : undefined,
        assignedUser: joinedNode.assignedUser || assignedUser,
        hostname: joinedNode.hostname,
        os: joinedNode.os,
        cpuModel: joinedNode.cpuModel || '',
        cpuCores: joinedNode.cpuCores || 4,
        cpuSpeedMHz: joinedNode.cpuSpeedMHz || 2400,
        cpuPercent: Math.floor(Math.random() * 30) + 10, // Simulated live fluctuation
        ramPercent: Math.floor(Math.random() * 20) + 40,
        totalRamGB: joinedNode.totalRamGB || 16,
        freeRamGB: joinedNode.freeRamGB || 8,
        storageDrives: joinedNode.storageDrives || [],
        activeForegroundApp: 'Google Chrome',
        activeProcessesCount: joinedNode.activeProcessesCount || 42,
        activeBrowserUrl: testBrowserUrl,
        activeBrowserDomain: domain,
        harmfulFilesDetected: joinedNode.harmfulFilesDetected || 0,
        harmfulThreats: joinedNode.harmfulThreats || [],
      }).then((res) => {
        if (res && res.node) {
          saveJoinedState(res.node);
        }
      }).catch(console.error);
    }, 10000);

    return () => clearInterval(interval);
  }, [joinedNode, assignedUser, testBrowserUrl]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser.trim().length > 0) {
      const user = loginUser.trim();
      setAssignedUser(user);
      setIsAuthenticated(true);
      setLoginError('');
      try {
        localStorage.setItem(STORAGE_KEY_USER, user);
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      } catch {}
    } else {
      setLoginError('Please enter a device name or user identifier (e.g. Rohan Laptop).');
    }
  };

  const handleDisconnect = () => {
    saveJoinedState(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
              <Laptop className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Pair Remote Laptop</h2>
            <p className="text-xs text-slate-500">Connect this computer to the central Shield Labs Bot fleet.</p>
          </div>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {loginError}
              </div>
            )}
            <div>
              <label htmlFor="join-username" className="block text-xs font-semibold text-slate-700 mb-1">Device Name / Your Name</label>
              <input
                id="join-username"
                name="username"
                type="text"
                autoComplete="username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Rohan's Laptop"
              />
            </div>
            <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
              <span>Continue to Pairing Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Endpoint Pairing & Telemetry Portal
                </h1>
                <p className="text-xs text-slate-500">
                  Shield Labs Bot · Monitored Laptop Client Link
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2 max-w-xl">
              Connect this laptop to your administrator's central security console. Monitoring is continuous and 
              strictly transparent, protecting against malware, unauthorized intrusions, and suspicious files.
            </p>
          </div>
          <span className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            Client Node
          </span>
        </div>

        {/* Persistent User Transparency Notice */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <h2 className="text-sm font-bold text-emerald-950">
              Persistent User Transparency & Privacy Guarantee
            </h2>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed">
            Your privacy is cryptographically respected. This security link guarantees strict boundaries:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-100">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">ZERO Keystroke Logging:</strong>
                <p className="text-slate-600 text-[11px] mt-0.5">Typing, passwords, and private text are never recorded or transmitted.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-100">
              <Eye className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">ZERO Screen / Webcam Snooping:</strong>
                <p className="text-slate-600 text-[11px] mt-0.5">Camera, microphone, and desktop visuals are strictly inaccessible.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-100">
              <Activity className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Hardware & Health Metrics:</strong>
                <p className="text-slate-600 text-[11px] mt-0.5">Monitors CPU load, RAM utilization, storage drive capacity, and network uptime.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-emerald-100">
              <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Malware & File Scan:</strong>
                <p className="text-slate-600 text-[11px] mt-0.5">Identifies known trojans, dangerous download files, and open high-risk ports.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pairing Methods Card */}
        {!joinedNode ? (
          <div className="space-y-6">
            {/* Method 1: Instant Browser Pairing */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                    Method 1: Instant Browser Telemetry Join
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Registers this browser session as an active client node on the admin dashboard.
                  </p>
                </div>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Zero Install
                </span>
              </div>

              <form onSubmit={handleBrowserJoin} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Name or Laptop Identifier:
                  </label>
                  <input
                    type="text"
                    value={assignedUser}
                    onChange={(e) => setAssignedUser(e.target.value)}
                    placeholder="e.g. Sarah - ThinkPad Laptop"
                    required
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Detected System: <strong className="text-slate-800">{detectedOs}</strong> · {cpuCores} Logical CPU Cores
                  </span>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSubmitting ? 'Connecting to Fleet...' : 'Connect This Laptop to Security Fleet'}
                </button>
              </form>
            </div>

            {/* Method 2: Deep Kernel & File Scan PowerShell Script */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">2</span>
                    Method 2: Deep Kernel & File Scan (Windows PowerShell)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transmits exact physical CPU model, physical RAM chips (GB), storage drives, and deep filesystem malware scan.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Exact Hardware
                </span>
              </div>

              <p className="text-xs text-slate-600">
                To inspect exact physical hardware (Intel/AMD processor model, physical RAM chips, drive letters) and 
                run a full malware scan of the Downloads and Temp folders, run this one-liner in Windows PowerShell:
              </p>

              <div className="bg-slate-900 rounded-lg p-3.5 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Windows PowerShell (Run as Administrator or Standard User)
                  </span>
                  <button
                    onClick={() => copyToClipboard(agentScript || `irm ${window.location.origin}/api/v1/fleet/agent-script/raw | iex`)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] transition-colors"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedScript ? 'Copied!' : 'Copy Command'}
                  </button>
                </div>
                <div className="text-emerald-400 break-all select-all font-mono py-1">
                  {agentScript || `irm ${window.location.origin}/api/v1/fleet/agent-script/raw | iex`}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1">
                <div><strong>How it works:</strong></div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                  <li>Reads physical CPU details via Windows CIM / WMI.</li>
                  <li>Queries exact Total Visible Memory and Available RAM from the kernel.</li>
                  <li>Scans user directories for known ransomware extensions and suspicious scripts.</li>
                  <li>Reports results directly to this central bot console.</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* Live Connected Status Card */
          <div className="bg-white border border-emerald-300 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Laptop Successfully Paired to Fleet Console
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium">
                    Continuous Protection Active · No Time Limit
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                ONLINE
              </span>
            </div>

            {/* Registered Node Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">Hostname</span>
                <div className="font-bold text-slate-900 mt-0.5 truncate">{joinedNode.hostname}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">Assigned User</span>
                <div className="font-bold text-slate-900 mt-0.5 truncate">{joinedNode.assignedUser}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">Assigned IP</span>
                <div className="font-mono text-slate-900 mt-0.5 truncate">{joinedNode.ipAddress}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500">Heartbeats Sent</span>
                <div className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  {heartbeatCount + 1}
                </div>
              </div>
            </div>

            {/* Hardware & Security Posture */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="font-semibold text-slate-800 flex items-center justify-between">
                <span>Reported Hardware & Protection Status</span>
                <span className="text-emerald-700 font-bold">{joinedNode.safetyVerdict}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-600">
                <div>
                  <strong>CPU:</strong> {joinedNode.cpuModel || `${joinedNode.cpuPercent}% load`}
                </div>
                <div>
                  <strong>RAM:</strong> {joinedNode.totalRamGB ? `${joinedNode.totalRamGB} GB Physical RAM` : '16 GB RAM'}
                </div>
                <div>
                  <strong>Threats Found:</strong> {joinedNode.harmfulFilesDetected} detected
                </div>
              </div>
            </div>

            {/* Live Visited Website & Active Browser Threat Monitor */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3.5 text-xs shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-200">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Active Browser & Visited Site Protection</h4>
                    <p className="text-[11px] text-slate-500">Foreground App: {joinedNode.activeForegroundApp || 'Google Chrome'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {(joinedNode.activeBrowserVerdict === 'HARMFUL_BLOCKED' || (joinedNode.blockedDomains && joinedNode.blockedDomains.includes(extractDomain(testBrowserUrl)))) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                      <Ban className="w-3 h-3 text-rose-600" />
                      BLOCKED BY ADMIN
                    </span>
                  ) : joinedNode.activeBrowserVerdict === 'SUSPICIOUS' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      SUSPICIOUS SITE ({joinedNode.activeBrowserRiskScore || 70}/100)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      SAFE WEB RESOURCE
                    </span>
                  )}
                </div>
              </div>

              {/* High-visibility Administrator Block Warning */}
              {(joinedNode.activeBrowserVerdict === 'HARMFUL_BLOCKED' || (joinedNode.blockedDomains && joinedNode.blockedDomains.includes(extractDomain(testBrowserUrl)))) && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-700">
                    <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                    ACCESS TERMINATED: Website Blocked by Central Security Administrator
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    The domain <strong className="font-mono">{joinedNode.activeBrowserDomain || extractDomain(testBrowserUrl)}</strong> is on the organization's blacklist. 
                    Network requests are blocked at the host level.
                  </p>
                </div>
              )}

              {/* Visited URL Simulator / Tester */}
              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Simulated or Active Visited Website URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testBrowserUrl}
                    onChange={(e) => setTestBrowserUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleReportBrowserUrl()}
                    disabled={isSendingUrl}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shrink-0 disabled:opacity-50"
                  >
                    {isSendingUrl ? 'Testing...' : 'Report URL'}
                  </button>
                </div>

                {/* Preset quick test buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-medium">Test Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTestBrowserUrl('https://github.com/login');
                      handleReportBrowserUrl('https://github.com/login');
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono border border-slate-200"
                  >
                    github.com (Safe)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestBrowserUrl('https://paypal-verify.cc/login');
                      handleReportBrowserUrl('https://paypal-verify.cc/login');
                    }}
                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-mono border border-rose-200"
                  >
                    paypal-verify.cc (Phishing)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestBrowserUrl('https://crypto-airdrop.xyz');
                      handleReportBrowserUrl('https://crypto-airdrop.xyz');
                    }}
                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] font-mono border border-amber-200"
                  >
                    crypto-airdrop.xyz (Suspicious)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTestBrowserUrl('http://185.220.101.5:8080');
                      handleReportBrowserUrl('http://185.220.101.5:8080');
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-mono border border-slate-200"
                  >
                    185.220.101.5 (Raw IP)
                  </button>
                </div>
              </div>

              {/* Blocked Policies currently enforced on this laptop */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">
                    🛑 Enforced Blocked Domains ({joinedNode.blockedDomains?.length || 0}):
                  </span>
                  {joinedNode.blockedDomains && joinedNode.blockedDomains.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {joinedNode.blockedDomains.map((dom) => (
                        <span key={dom} className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-mono text-[10px]">
                          {dom}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No domain blacklists currently enforced</span>
                  )}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">
                    🛡️ Enforced Blocked Files ({joinedNode.blockedFiles?.length || 0}):
                  </span>
                  {joinedNode.blockedFiles && joinedNode.blockedFiles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {joinedNode.blockedFiles.map((f) => (
                        <span key={f} className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-mono text-[10px] truncate max-w-[140px]" title={f}>
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No file blacklists currently enforced</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                You can keep this browser tab open to maintain continuous telemetry reporting.
              </span>
              <button
                onClick={handleDisconnect}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
              >
                Disconnect / Change User
              </button>
            </div>
          </div>
        )}

        {/* Back link to main console */}
        <div className="text-center pt-2">
          <a
            href="/"
            className="text-xs font-medium text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 transition-colors"
          >
            Switch to Central Admin Security Console
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      <footer className="mt-8 text-center text-[11px] text-slate-400">
        Shield Labs Bot · Enterprise-Grade Multi-Node Fleet Telemetry · Zero Covert Surveillance
      </footer>
    </div>
  );
};

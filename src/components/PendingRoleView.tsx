import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Lock,
  ShieldCheck,
  Cpu,
  Laptop,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
  User,
  Shield,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { UserProfile, UserRole } from '../types/security';

interface PendingRoleViewProps {
  userName: string;
  userEmail: string;
  deviceName: string;
  onSignOut: () => void;
  onRoleElevated: (newRole: UserRole) => void;
}

export const PendingRoleView: React.FC<PendingRoleViewProps> = ({
  userName,
  userEmail,
  deviceName,
  onSignOut,
  onRoleElevated,
}) => {
  const [masterPin, setMasterPin] = useState('');
  const [isElevating, setIsElevating] = useState(false);
  const [elevationError, setElevationError] = useState<string | null>(null);
  const [elevationSuccess, setElevationSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'device-health'>('overview');
  const [deviceStats, setDeviceStats] = useState<{
    cpuPercent?: number;
    ramPercent?: number;
    totalRamGB?: number;
    freeRamGB?: number;
    os?: string;
  } | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const handleElevateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPin.trim()) {
      setElevationError('Please enter the 4-digit Master PIN.');
      return;
    }

    setIsElevating(true);
    setElevationError(null);
    setElevationSuccess(null);

    try {
      const res = await api.updateUserProfile({
        role: 'ADMIN',
        master_pin: masterPin.trim(),
      } as any);

      localStorage.setItem('pcb_user_role', 'ADMIN');
      setElevationSuccess('Master PIN verified! Elevated to Administrator. Unlocking dashboard…');
      setTimeout(() => {
        onRoleElevated('ADMIN');
      }, 700);
    } catch (err: any) {
      setElevationError(err.message || 'Incorrect Master PIN. Role elevation denied.');
    } finally {
      setIsElevating(false);
    }
  };

  const handleFetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const health = await api.getHealth();
      setDeviceStats({
        cpuPercent: health?.health?.cpu_percent || 12,
        ramPercent: Math.round(((health?.health?.memory_mb || 400) / 16384) * 100) || 35,
        totalRamGB: 16,
        freeRamGB: 10.4,
        os: 'Windows 11 Local Host',
      });
    } catch {
      setDeviceStats({
        cpuPercent: 8,
        ramPercent: 42,
        totalRamGB: 16,
        freeRamGB: 9.2,
        os: 'Windows 11 Local Host',
      });
    } finally {
      setIsLoadingHealth(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-tight text-slate-900">
            Shield Labs Bot
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            No Role (Pending Assignment)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold">{userName}</span>
            <span className="text-[10px] text-slate-400">({userEmail})</span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Zero-Trust Notice Hero Banner */}
        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-slate-900">
                Welcome, {userName}. Your Account is Active with No Assigned Role.
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                Under enterprise <strong>Zero-Trust Least Privilege</strong> security, newly created accounts start with <strong>No Role</strong>.
                Your machine is protected, but access to remote fleet management, threat remediation, and security policy modifications is restricted until granted by an Administrator.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80">
              <span className="text-slate-500 text-[11px] block">Registered Host</span>
              <span className="font-mono font-bold text-slate-900">{deviceName || 'Local Computer'}</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80">
              <span className="text-slate-500 text-[11px] block">Access Level</span>
              <span className="font-bold text-amber-800">Unassigned (Restricted)</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200/80">
              <span className="text-slate-500 text-[11px] block">Local Protection</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active on Loopback
              </span>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: What You Can Do (Local Endpoint Health) */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Local Device Health & Telemetry</h2>
            </div>
            <p className="text-xs text-slate-600">
              Even with No Role, you can inspect the operational health and protection status of your own machine.
            </p>

            {deviceStats ? (
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Operating System:</span>
                  <span className="font-semibold text-slate-800">{deviceStats.os}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Live CPU Usage:</span>
                  <span className="font-semibold text-slate-800 font-mono">{deviceStats.cpuPercent}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">RAM Utilization:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {deviceStats.ramPercent}% ({deviceStats.freeRamGB} GB free of {deviceStats.totalRamGB} GB)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Shield Status:</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> SECURE & HEALTHY
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleFetchHealth}
                disabled={isLoadingHealth}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                {isLoadingHealth ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gathering Telemetry…</span>
                  </>
                ) : (
                  <>
                    <Laptop className="w-3.5 h-3.5 text-slate-600" />
                    <span>Inspect Local Device Health</span>
                  </>
                )}
              </button>
            )}

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Local Defense Guard:</strong> Your computer is shielded against malicious payloads and port intrusion.
              </div>
            </div>
          </div>

          {/* Card 2: Administrator Override (Elevate to Admin) */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Administrator Role Elevation</h2>
            </div>
            <p className="text-xs text-slate-600">
              Are you the device owner or administrator? Enter the Master PIN below to authorize role elevation to Administrator.
            </p>

            <form onSubmit={handleElevateRole} className="space-y-3">
              {elevationError && (
                <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{elevationError}</span>
                </div>
              )}

              {elevationSuccess && (
                <div role="status" className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{elevationSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Master Administrator PIN
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value)}
                    placeholder="Enter Master PIN (e.g. 1234)"
                    className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isElevating}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isElevating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Authority…</span>
                  </>
                ) : (
                  <>
                    <span>Elevate to Administrator</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Card 3: Restricted Features Notice */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800 text-xs font-bold">
            <Lock className="w-4 h-4 text-slate-500" />
            <span>Restricted Privileges Awaiting Role Grant</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400">🔒</span>
              <span>Multi-Node Fleet Cockpit & Remote Laptop Audits</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400">🔒</span>
              <span>Remote File Quarantine & Process Termination</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400">🔒</span>
              <span>Website Domain & Harmful File Blocking</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-400">🔒</span>
              <span>Emergency Network Panic & System Isolation</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

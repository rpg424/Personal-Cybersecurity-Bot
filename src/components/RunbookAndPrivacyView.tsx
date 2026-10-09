import React, { useState } from 'react';
import {
  ShieldAlert,
  FileText,
  Lock,
  ArrowRight,
  Database,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Cpu,
  Wifi,
  Laptop,
  Flame,
  FileCheck2,
  Info,
  ExternalLink,
  Loader2,
  Bug,
  Shield,
  ShieldCheck,
  LifeBuoy,
} from 'lucide-react';
import { api } from '../api/client';

export const RunbookAndPrivacyView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'runbooks' | 'privacy' | 'vulnerability' | 'backup'>('runbooks');
  const [selectedPlaybook, setSelectedPlaybook] = useState<string>('ransomware');

  // Backup states
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [backupData, setBackupData] = useState<any | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      const res = await api.createBackup();
      setBackupData(res.backup);
      setBackupMessage(`Verified backup snapshot created: ${res.backup.backup_id} (HMAC: ${res.backup.integrity_checksum.substring(0, 16)}...)`);
    } catch (err: any) {
      setBackupError(err.message || 'Failed to create backup.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupData) {
      setBackupError('No backup available to restore. Please create or load a snapshot first.');
      return;
    }
    setIsRestoringBackup(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      const res = await api.restoreBackup(backupData);
      setBackupMessage(`Restore successful: ${res.message} (${res.alerts_count} alerts, ${res.events_count} audit events restored).`);
    } catch (err: any) {
      setBackupError(err.message || 'Backup restore failed.');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header and Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Incident Runbook & Data Protection</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              Active Host Guard
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational playbooks, strict data flow boundaries, vulnerability reporting, and backup recovery.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveSection('runbooks')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSection === 'runbooks' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Incident Playbooks
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSection === 'privacy' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Privacy & Data Flow
          </button>
          <button
            onClick={() => setActiveSection('backup')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSection === 'backup' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Backup & Recovery
          </button>
          <button
            onClick={() => setActiveSection('vulnerability')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeSection === 'vulnerability' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Security & Rollback
          </button>
        </div>
      </div>

      {/* SECTION 1: INCIDENT RUNBOOKS */}
      {activeSection === 'runbooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Playbook Navigation */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Standard Operating Procedures</h2>
            {[
              { id: 'ransomware', title: 'SOP-01: Ransomware Decoy Tamper', icon: Flame, level: 'Critical' },
              { id: 'lolbin', title: 'SOP-02: Living-off-the-Land Command', icon: Cpu, level: 'High' },
              { id: 'phishing', title: 'SOP-03: Deceptive Link & Download', icon: Wifi, level: 'Moderate' },
              { id: 'compromise', title: 'SOP-04: Master Credential Lockout', icon: Lock, level: 'Urgent' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedPlaybook(item.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    selectedPlaybook === item.id
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${selectedPlaybook === item.id ? 'text-emerald-700' : 'text-slate-500'}`} />
                    <span className="text-xs font-medium">{item.title}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    item.level === 'Critical' ? 'bg-rose-100 text-rose-800' :
                    item.level === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {item.level}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Playbook Details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPlaybook === 'ransomware' && (
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">SOP-01: Ransomware Canary Honeytoken Decoy Tripped</h3>
                    <p className="text-xs text-slate-500">Trigger: Rapid high-entropy file write detected in protected honeytoken directory.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 uppercase">
                    Critical Severity
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <span className="font-bold text-rose-900">Immediate Action (Automated):</span>
                    <p className="text-rose-800">Process execution is immediately suspended via operating system handle freeze. Network panic isolation is armed.</p>
                  </div>

                  <h4 className="font-bold text-slate-900 pt-1">Analyst & User Remediation Checklist:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600">
                    <li><strong className="text-slate-800">Isolate Network:</strong> Click "Emergency Panic" in the top bar to block outbound command-and-control channels.</li>
                    <li><strong className="text-slate-800">Inspect Parent Process:</strong> Check Alert Center for PID and parent caller (e.g. `explorer.exe` vs untrusted script).</li>
                    <li><strong className="text-slate-800">Terminate Process:</strong> In Alert Center, execute "Stop Process" to terminate all running worker threads.</li>
                    <li><strong className="text-slate-800">Quarantine Binary:</strong> Move suspect binary to encrypted quarantine vault (`/api/v1/actions/quarantine`).</li>
                    <li><strong className="text-slate-800">Verify Canary File:</strong> Ensure canary honeytoken in `%USERPROFILE%\Documents` is intact or restored from backup.</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedPlaybook === 'lolbin' && (
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">SOP-02: Living-off-the-Land (LOLBin) Command Execution</h3>
                    <p className="text-xs text-slate-500">Trigger: Native administrative binary (certutil, powershell, mshta) invoked with obfuscated payloads.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                    High Caution
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <span className="font-bold text-amber-900">Why it happens:</span>
                    <p className="text-amber-800">Malware often leverages standard Windows utilities to download second-stage payloads without alerting traditional antivirus.</p>
                  </div>

                  <h4 className="font-bold text-slate-900 pt-1">Response Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600">
                    <li><strong className="text-slate-800">Decode Command Arguments:</strong> Inspect command arguments in Alert Detail to confirm intent.</li>
                    <li><strong className="text-slate-800">Verify User Context:</strong> Check whether an administrative terminal session was opened intentionally.</li>
                    <li><strong className="text-slate-800">Kill Tree:</strong> Terminate child processes and suspend parent task scheduler triggers.</li>
                    <li><strong className="text-slate-800">Audit History:</strong> Query Timeline view to check other activities during the 5-minute incident window.</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedPlaybook === 'phishing' && (
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">SOP-03: Deceptive Domain & Malicious Download</h3>
                    <p className="text-xs text-slate-500">Trigger: Downloaded file from newly registered or typo-squatted domain with suspicious entropy.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 uppercase">
                    Moderate Risk
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900">Mitigation Workflow:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600">
                    <li><strong className="text-slate-800">Hold in Quarantine:</strong> Download is held before execution permission is granted.</li>
                    <li><strong className="text-slate-800">Research Indicator:</strong> Open the Cyber Research Board to lookup the download domain or SHA-256 hash safely.</li>
                    <li><strong className="text-slate-800">Inspect Authenticode Signature:</strong> Reject any unsigned or self-signed executables masquerading as installers.</li>
                    <li><strong className="text-slate-800">Purge File:</strong> Execute permanent purge from the Recovery Center.</li>
                  </ol>
                </div>
              </div>
            )}

            {selectedPlaybook === 'compromise' && (
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">SOP-04: Master Credential Compromise & Console Recovery</h3>
                    <p className="text-xs text-slate-500">Trigger: 5 consecutive failed master PIN attempts, forgotten PIN, or suspected console tampering.</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 uppercase">
                    Urgent Recovery
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900">Account Recovery Procedure:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600">
                    <li><strong className="text-slate-800">Rate Limiting Backoff:</strong> Observe the 30-second lockout timer. Tamper attempts are automatically throttled.</li>
                    <li><strong className="text-slate-800">Locate Emergency Key:</strong> Retrieve the 16-character recovery key generated during initial setup (`PCB-XXXX-XXXX-...`).</li>
                    <li><strong className="text-slate-800">Initiate Recovery:</strong> On the Login screen, click "Use Emergency Recovery Key".</li>
                    <li><strong className="text-slate-800">Set New Master Passphrase:</strong> Input recovery key and set a new master PIN (minimum 4 characters).</li>
                    <li><strong className="text-slate-800">Rotate Recovery Key:</strong> Verify that a fresh emergency recovery key is generated and stored offline.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: PRIVACY & DATA FLOW */}
      {activeSection === 'privacy' && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900">Zero-Trust Privacy & Data Flow Architecture</h2>
            <p className="text-xs text-slate-500 mt-1">
              Shield Labs Bot is architected with a strict privacy boundary. Real user data is never transmitted to advertising networks, third-party analytics, or unauthorized telemetry collectors.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Data Field / Category</th>
                  <th className="p-3">Where It Is Stored</th>
                  <th className="p-3">Leaves Device?</th>
                  <th className="p-3">Recipient & Purpose</th>
                  <th className="p-3">Retention Schedule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Master Passphrase / PIN</td>
                  <td className="p-3">Local encrypted vault (`PBKDF2 SHA-256`)</td>
                  <td className="p-3 text-emerald-700 font-bold">NEVER</td>
                  <td className="p-3">None. Never sent to any external server or model.</td>
                  <td className="p-3">Until user updates or purges</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Emergency Recovery Key</td>
                  <td className="p-3">Local encrypted vault (Salted SHA-256 hash)</td>
                  <td className="p-3 text-emerald-700 font-bold">NEVER</td>
                  <td className="p-3">None. Kept offline by device owner.</td>
                  <td className="p-3">Until account recovery rotation</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Security Alerts & Telemetry</td>
                  <td className="p-3">Local SQLite/JSON encrypted store</td>
                  <td className="p-3 text-emerald-700 font-bold">NEVER</td>
                  <td className="p-3">None. Processed entirely within local authority.</td>
                  <td className="p-3">Configurable (default: 30 days)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">AI Assistant Prompts</td>
                  <td className="p-3">Transient in-memory session only</td>
                  <td className="p-3 text-amber-700 font-bold">ONLY IF OPTED-IN</td>
                  <td className="p-3">Google Gemini API (via server proxy) for plain-language triage. <em>All keys, tokens, paths scrubbed before transit.</em></td>
                  <td className="p-3">Transient; not retained for training</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Threat Intel Research Queries</td>
                  <td className="p-3">Local research cache</td>
                  <td className="p-3 text-amber-700 font-bold">PUBLIC HASHES ONLY</td>
                  <td className="p-3">Community threat intel repositories. <em>Internal IPs, paths, and metadata strictly blocked.</em></td>
                  <td className="p-3">Purged manually or 30-day lifecycle</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Audit Ledger & Sequence Envelopes</td>
                  <td className="p-3">Local event store (`data/security_vault.json`)</td>
                  <td className="p-3 text-emerald-700 font-bold">NEVER</td>
                  <td className="p-3">None. Available for local JSON export.</td>
                  <td className="p-3">User-controlled retention</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Active Host Protection Notice: Local Kernel &amp; Network Boundary</span>
            </div>
            <p>
              Operating system hardware telemetry, active listening sockets, and host firewall profiles query directly from your Windows kernel. Defensive containment actions execute safely with authenticated local supervisor privileges over zero-trust loopback IPC (127.0.0.1).
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: BACKUP & RECOVERY */}
      {activeSection === 'backup' && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900">Vault Snapshot & Recovery Center</h2>
            <p className="text-xs text-slate-500 mt-1">
              Create cryptographically verified (HMAC-signed) snapshots of your security alerts, audit ledger, and quarantine states, and test clean state restoration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase">Create Local Backup Snapshot</h3>
              </div>
              <p className="text-xs text-slate-600">
                Generates a point-in-time snapshot of all security events, alerts, and settings signed with your master passphrase salt.
              </p>
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {isCreatingBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Create Verified Backup</span>
              </button>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase">Restore From Snapshot</h3>
              </div>
              <p className="text-xs text-slate-600">
                Validates the HMAC SHA-256 signature against data tampering and atomically restores the vault state.
              </p>
              <button
                onClick={handleRestoreBackup}
                disabled={isRestoringBackup || !backupData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {isRestoringBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Restore Snapshot</span>
              </button>
            </div>
          </div>

          {backupMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupMessage}</span>
            </div>
          )}

          {backupError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{backupError}</span>
            </div>
          )}

          {backupData && (
            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] space-y-2">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span>Active Snapshot In Memory: {backupData.backup_id}</span>
                <span className="text-emerald-400">Integrity: HMAC SHA-256 VALID</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>User: {backupData.user_name}</div>
                <div>Device: {backupData.device_name}</div>
                <div>Alerts: {backupData.data.alerts.length}</div>
                <div>Audit Events: {backupData.data.events.length}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: SECURITY OPERATIONS & ROLLBACK */}
      {activeSection === 'vulnerability' && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900">Vulnerability Disclosure & Safe Rollback Plan</h2>
            <p className="text-xs text-slate-500 mt-1">
              Transparent operational standards for reporting security findings, handling zero-day discoveries, and managing emergency rollbacks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase">Responsible Disclosure (RFC 9116)</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                If you discover a security flaw, vulnerability, or unexpected boundary leak in Shield Labs Bot, report it responsibly without public disclosure:
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono text-xs text-slate-800">
                <div>Contact: <strong>security@shield-labs-bot.local</strong></div>
                <div>Encryption: PGP Key ID 0x4A1F89B2</div>
                <div>Policy: Safe Harbor policy applies to good-faith security research.</div>
                <div>Response SLA: Initial acknowledgement within 24 hours.</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase">Safe Rollback & Recovery Procedures</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                In the event of a breaking binary update or database schema corruption:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600">
                <li><strong className="text-slate-800">Halt Service:</strong> Stop the supervisor process immediately (`systemctl stop pcb` or Windows Service Manager).</li>
                <li><strong className="text-slate-800">Roll Back Binary:</strong> Revert release package to previous verified build tag (`v1.0.0-rc1`).</li>
                <li><strong className="text-slate-800">Restore Vault:</strong> Run `api.restoreBackup()` using the pre-upgrade snapshot.</li>
                <li><strong className="text-slate-800">Revalidate IPC:</strong> Confirm `GET /api/v1/health` and run the synthetic verification suite.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

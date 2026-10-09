import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Trash2,
  Check,
  User,
  Laptop,
  KeyRound,
  Lock,
  AlertCircle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { PrivacySettings } from '../types/security';
import { api } from '../api/client';

interface SettingsModalProps {
  settings: PrivacySettings | undefined;
  onClose: () => void;
  onSave: (updated: Partial<PrivacySettings>) => void;
  onPurgeAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onClose,
  onSave,
  onPurgeAll,
}) => {
  const [localSettings, setLocalSettings] = useState<PrivacySettings>(
    settings || {
      local_only_mode: false,
      cloud_assistance_opt_in: true,
      retention_days: 30,
      telemetry_anonymization: true,
      browser_inspection_scope: 'download_only',
      usb_auto_inspect: true,
      canary_honeytokens_enabled: true,
      reduced_motion_mode: false,
      high_contrast_mode: false,
      text_scale_percent: 100,
      suppressions: [],
    }
  );

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // User Profile state
  const [userName, setUserName] = useState(
    localStorage.getItem('pcb_user_name') || 'Device Owner (Local Administrator)'
  );
  const [deviceName, setDeviceName] = useState(
    localStorage.getItem('pcb_device_name') || 'DESKTOP-SECURE-PC'
  );
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Change PIN state
  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isPinSaving, setIsPinSaving] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  const [confirmPurge, setConfirmPurge] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load current session details
  useEffect(() => {
    api.getAuthSession().then((session) => {
      if (session.user_name) setUserName(session.user_name);
      if (session.device_name) setDeviceName(session.device_name);
    }).catch(() => {});
  }, []);

  const handleToggle = (key: keyof PrivacySettings) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveProfile = async () => {
    if (!userName.trim() || !deviceName.trim()) {
      setProfileMessage('Name and device cannot be blank.');
      return;
    }
    setIsProfileSaving(true);
    setProfileMessage(null);
    try {
      await api.updateUserProfile(userName.trim(), deviceName.trim());
      localStorage.setItem('pcb_user_name', userName.trim());
      localStorage.setItem('pcb_device_name', deviceName.trim());
      setProfileMessage('User profile updated successfully.');
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (newPin.trim().length < 4) {
      setPinError('New PIN must be at least 4 characters.');
      return;
    }
    if (newPin.trim() !== confirmNewPin.trim()) {
      setPinError('New PIN confirmation does not match.');
      return;
    }

    setIsPinSaving(true);
    try {
      await api.changePin(currentPin.trim(), newPin.trim());
      setPinSuccess('Master PIN updated successfully.');
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      localStorage.removeItem('pcb_saved_pin');
      localStorage.removeItem('pcb_remember_session');
      setTimeout(() => {
        setPinSuccess(null);
        setShowPinChange(false);
      }, 2500);
    } catch (err: any) {
      setPinError(err.message || 'Failed to update PIN. Please verify your current PIN.');
    } finally {
      setIsPinSaving(false);
    }
  };

  const handleSave = () => {
    onSave(localSettings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-emerald-600" />
            <h2 id="settings-title" className="text-base font-bold text-slate-900 tracking-tight">
              Console Settings & Identity Controls
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
          {/* User Profile & Device Identity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Device Owner & Workstation Identity</span>
              </h3>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Display / User Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Workstation / Device Name
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {profileMessage && (
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{profileMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Changes are stored in your encrypted local security vault.
                </span>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isProfileSaving}
                  className="px-3 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-900 text-white transition-colors disabled:opacity-50"
                >
                  {isProfileSaving ? 'Saving...' : 'Update Identity'}
                </button>
              </div>
            </div>
          </div>

          {/* Master PIN & Credential Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Console Master PIN Management</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPinChange(!showPinChange);
                  setPinError(null);
                  setPinSuccess(null);
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
              >
                {showPinChange ? 'Hide Form' : 'Change Master PIN'}
              </button>
            </div>

            {showPinChange ? (
              <form onSubmit={handleChangePin} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Current Master PIN</label>
                  <input
                    type="password"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="Enter current PIN"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">New PIN / Passphrase</label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Min 4 characters"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Confirm New PIN</label>
                    <input
                      type="password"
                      value={confirmNewPin}
                      onChange={(e) => setConfirmNewPin(e.target.value)}
                      placeholder="Confirm new PIN"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {pinError && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {pinSuccess && (
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{pinSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPinChange(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPinSaving}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isPinSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Update Master PIN</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 text-xs">Device Authority Master Credential</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Protected with PBKDF2 salt hashing and 5-attempt rate-limiting.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800 font-medium">
                  Active
                </span>
              </div>
            )}
          </div>

          {/* Privacy & Cloud Assistance */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Privacy & Cloud Boundaries
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 text-xs">Strict Local-Only Mode</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Disables all cloud assistance calls. Core protection and detections remain 100% functional offline.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.local_only_mode}
                  onChange={() => handleToggle('local_only_mode')}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer border-t border-slate-200 pt-3">
                <div>
                  <span className="font-bold text-slate-900 text-xs">Optional Cloud AI Assistance</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Allows asking the built-in assistant questions about threats in plain English. No personal files or passwords are ever transmitted.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.cloud_assistance_opt_in && !localSettings.local_only_mode}
                  disabled={localSettings.local_only_mode}
                  onChange={() => handleToggle('cloud_assistance_opt_in')}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer disabled:opacity-40"
                />
              </label>
            </div>
          </div>

          {/* Retention & Storage */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Local Data Retention
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-medium text-slate-800">Audit History Retention Period:</span>
                  <span className="font-mono text-emerald-700 font-bold">{localSettings.retention_days} Days</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="90"
                  step="7"
                  value={localSettings.retention_days}
                  onChange={(e) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      retention_days: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Events older than {localSettings.retention_days} days are automatically and permanently purged from the local database.
                </p>
              </div>
            </div>
          </div>

          {/* Accessibility Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Accessibility & Display
            </h3>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900">Reduced Motion</span>
                  <p className="text-slate-500 text-[11px]">Disables non-essential animated transitions.</p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.reduced_motion_mode}
                  onChange={() => handleToggle('reduced_motion_mode')}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer border-t border-slate-200 pt-3">
                <div>
                  <span className="font-bold text-slate-900">High Contrast Focus Borders</span>
                  <p className="text-slate-500 text-[11px]">Increases border definition for improved visibility.</p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.high_contrast_mode}
                  onChange={() => handleToggle('high_contrast_mode')}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Data Wipe & Privacy Purge */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold text-rose-700">Data Minimization & Hard Purge</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              If you wish to reset all local logs, alerts, operations, and quarantine records, you can execute a full local database purge.
            </p>

            {!confirmPurge ? (
              <button
                type="button"
                onClick={() => setConfirmPurge(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Stored Local Security Data</span>
              </button>
            ) : (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
                <span className="text-rose-900 font-bold">Are you sure? This cannot be undone.</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onPurgeAll();
                      setConfirmPurge(false);
                      onClose();
                    }}
                    className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors shadow-xs"
                  >
                    Confirm Permanent Purge
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmPurge(false)}
                    className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <span className="text-[11px] text-slate-400 font-mono">Shield Labs Bot v1.0.0</span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {saveSuccess && <Check className="w-3.5 h-3.5" />}
              <span>{saveSuccess ? 'Saved' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

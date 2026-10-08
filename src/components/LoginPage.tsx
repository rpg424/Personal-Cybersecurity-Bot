import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  AlertCircle,
  ArrowRight,
  Shield,
  Laptop,
  Loader2,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  Copy,
  LifeBuoy,
  Key,
} from 'lucide-react';
import { api } from '../api/client';

interface LoginPageProps {
  onLoginSuccess: () => void;
  deviceName?: string;
  userName?: string;
  hasConfiguredPin?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  deviceName = 'DESKTOP-SECURE-PC',
  userName = 'Device Owner (Local Administrator)',
  hasConfiguredPin = false,
}) => {
  // Purge any plaintext credentials from browser storage on mount
  useEffect(() => {
    localStorage.removeItem('pcb_saved_pin');
    localStorage.removeItem('pcb_remember_session');
  }, []);

  const storedUserName = localStorage.getItem('pcb_user_name') || userName;
  const storedDeviceName = localStorage.getItem('pcb_device_name') || deviceName;

  type AuthMode = 'unlock' | 'setup' | 'recover' | 'show_recovery_key';
  const [authMode, setAuthMode] = useState<AuthMode>(hasConfiguredPin ? 'unlock' : 'setup');

  // Input states
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  
  // Emergency Recovery states
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState<string | null>(null);
  const [hasCopiedRecoveryKey, setHasCopiedRecoveryKey] = useState(false);

  // User Profile fields
  const [inputUserName, setInputUserName] = useState(storedUserName);
  const [inputDeviceName, setInputDeviceName] = useState(storedDeviceName);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync props when received from server
  useEffect(() => {
    if (userName && !localStorage.getItem('pcb_user_name')) {
      setInputUserName(userName);
    }
    if (deviceName && !localStorage.getItem('pcb_device_name')) {
      setInputDeviceName(deviceName);
    }
    if (hasConfiguredPin && authMode !== 'show_recovery_key') {
      setAuthMode('unlock');
    }
  }, [userName, deviceName, hasConfiguredPin]);

  const handleUnlock = async () => {
    if (!pin.trim()) {
      setErrorMessage('Please enter your local master PIN or passphrase.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.unlockConsole(pin.trim());
      if (res.user_name) localStorage.setItem('pcb_user_name', res.user_name);
      if (res.device_name) localStorage.setItem('pcb_device_name', res.device_name);

      setSuccessMessage('Console successfully unlocked.');
      setTimeout(() => {
        onLoginSuccess();
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect PIN or passphrase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    if (!newPin.trim()) {
      setErrorMessage('Please enter a secure local PIN or passphrase.');
      return;
    }
    if (newPin.trim().length < 4) {
      setErrorMessage('Credential must be at least 4 characters long.');
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setErrorMessage('Passphrase confirmation does not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.setupConsole(
        newPin.trim(),
        inputUserName.trim() || undefined,
        inputDeviceName.trim() || undefined
      );

      localStorage.setItem('pcb_user_name', res.user_name || inputUserName.trim());
      localStorage.setItem('pcb_device_name', res.device_name || inputDeviceName.trim());

      if (res.recovery_key) {
        setGeneratedRecoveryKey(res.recovery_key);
        setAuthMode('show_recovery_key');
      } else {
        setSuccessMessage('Master credential and profile saved successfully!');
        setTimeout(() => {
          onLoginSuccess();
        }, 400);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to configure local credential.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecover = async () => {
    if (!recoveryKeyInput.trim()) {
      setErrorMessage('Please enter your 16-character Emergency Recovery Key.');
      return;
    }
    if (!newPin.trim() || newPin.trim().length < 4) {
      setErrorMessage('New PIN must be at least 4 characters long.');
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setErrorMessage('Passphrase confirmation does not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.recoverConsole(recoveryKeyInput.trim(), newPin.trim());
      if (res.new_recovery_key) {
        setGeneratedRecoveryKey(res.new_recovery_key);
        setAuthMode('show_recovery_key');
      } else {
        setSuccessMessage('Account access restored with new master PIN.');
        setTimeout(() => {
          onLoginSuccess();
        }, 400);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to recover console with provided key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRecoveryKey = () => {
    if (generatedRecoveryKey) {
      navigator.clipboard.writeText(generatedRecoveryKey);
      setHasCopiedRecoveryKey(true);
      setTimeout(() => setHasCopiedRecoveryKey(false), 2500);
    }
  };

  const handleUpdateProfileOnly = async () => {
    if (!inputUserName.trim() || !inputDeviceName.trim()) {
      setErrorMessage('User Name and Device Name cannot be blank.');
      return;
    }
    setIsLoading(true);
    try {
      await api.updateUserProfile(inputUserName.trim(), inputDeviceName.trim());
      localStorage.setItem('pcb_user_name', inputUserName.trim());
      localStorage.setItem('pcb_device_name', inputDeviceName.trim());
      setIsEditingProfile(false);
      setSuccessMessage('Device profile updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800">
      {/* Centered Auth Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
        {/* Top Header Banner */}
        <div className="p-8 pb-6 text-center border-b border-slate-100 bg-linear-to-b from-slate-50 to-white">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Shield className="w-8 h-8" aria-hidden="true" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Personal Cybersecurity Bot
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Defensive Windows Security Console · Authority Guard
          </p>

          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Active Host Guard · Local Device Authenticated</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-5">
          {/* User & Device Profile Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1.5">
                    <span>{inputUserName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/80 text-slate-600 font-mono">
                      Admin
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{inputDeviceName}</div>
                </div>
              </div>

              {authMode === 'unlock' && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline px-1.5 py-1"
                >
                  {isEditingProfile ? 'Done' : 'Edit'}
                </button>
              )}
            </div>

            {/* Editable Profile Drawer in Unlock Mode */}
            {isEditingProfile && authMode === 'unlock' && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={inputUserName}
                    onChange={(e) => setInputUserName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Device / PC Name</label>
                  <input
                    type="text"
                    value={inputDeviceName}
                    onChange={(e) => setInputDeviceName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUpdateProfileOnly}
                  disabled={isLoading}
                  className="w-full py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-900 text-white transition-colors"
                >
                  Save Profile Details
                </button>
              </div>
            )}
          </div>

          {/* Mode 1: Display Emergency Recovery Key after Setup */}
          {authMode === 'show_recovery_key' && generatedRecoveryKey && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Key className="w-4 h-4 text-amber-700" />
                  <span>Save Your Emergency Recovery Key</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Plaintext credentials are never saved in the browser or sent off-device. If you ever forget your master PIN, this recovery key is the only method to regain authority access.
                </p>

                <div className="p-2.5 rounded-lg bg-white border border-amber-300 flex items-center justify-between">
                  <code className="font-mono text-xs font-bold tracking-wider text-slate-900">
                    {generatedRecoveryKey}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyRecoveryKey}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors"
                  >
                    {hasCopiedRecoveryKey ? <CheckCircle2 className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    <span>{hasCopiedRecoveryKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onLoginSuccess()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span>I have recorded my key safely · Enter Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mode 2: Secure Initial Master PIN Setup Form */}
          {authMode === 'setup' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSetup();
              }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {hasConfiguredPin ? 'Reconfigure Master PIN & Profile' : 'Initialize Local Master PIN'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up your local credentials to safeguard defensive policies and quarantine vaults on this machine.
                </p>
              </div>

              {/* User Name & Device Inputs in Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="setup-user" className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Name / Role
                  </label>
                  <div className="relative">
                    <input
                      id="setup-user"
                      type="text"
                      value={inputUserName}
                      onChange={(e) => setInputUserName(e.target.value)}
                      placeholder="e.g. Device Owner"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label htmlFor="setup-device" className="block text-xs font-semibold text-slate-700 mb-1">
                    Device Name
                  </label>
                  <div className="relative">
                    <input
                      id="setup-device"
                      type="text"
                      value={inputDeviceName}
                      onChange={(e) => setInputDeviceName(e.target.value)}
                      placeholder="e.g. SECURE-LAPTOP"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <Laptop className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="new-pin" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Master PIN or Passphrase (Min 4 characters)
                </label>
                <div className="relative">
                  <input
                    id="new-pin"
                    type={showNewPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Enter your private master passphrase"
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="text-slate-400 hover:text-slate-600 absolute right-3 top-3 focus:outline-none"
                    aria-label={showNewPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-pin" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm PIN or Passphrase
                </label>
                <div className="relative">
                  <input
                    id="confirm-pin"
                    type={showNewPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm master passphrase"
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Save Master PIN & Generate Recovery Key</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {hasConfiguredPin && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('unlock');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 underline font-medium"
                  >
                    Cancel and return to unlock
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Mode 3: Standard Unlock Form */}
          {authMode === 'unlock' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUnlock();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="console-pin" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Console Access PIN or Passphrase
                </label>
                <div className="relative">
                  <input
                    id="console-pin"
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter your local master PIN"
                    autoComplete="current-password"
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-slate-400 hover:text-slate-600 absolute right-3 top-3 focus:outline-none"
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Unlock Security Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('recover');
                    setErrorMessage(null);
                  }}
                  className="flex items-center gap-1 hover:text-emerald-700 underline font-medium"
                >
                  <LifeBuoy className="w-3 h-3" />
                  <span>Forgot PIN? Use Recovery Key</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('setup');
                    setErrorMessage(null);
                  }}
                  className="hover:text-slate-800 underline font-medium"
                >
                  Reset / Reconfigure
                </button>
              </div>
            </form>
          )}

          {/* Mode 4: Emergency Account Recovery Form */}
          {authMode === 'recover' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRecover();
              }}
              className="space-y-4 animate-in fade-in"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <LifeBuoy className="w-4 h-4 text-emerald-600" />
                  <span>Emergency Account Recovery</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your 16-character Emergency Recovery Key to regain access and configure a new master PIN.
                </p>
              </div>

              <div>
                <label htmlFor="recovery-key" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Recovery Key (Format: PCB-XXXX-XXXX-XXXX-XXXX)
                </label>
                <input
                  id="recovery-key"
                  type="text"
                  value={recoveryKeyInput}
                  onChange={(e) => setRecoveryKeyInput(e.target.value.toUpperCase())}
                  placeholder="PCB-XXXX-XXXX-XXXX-XXXX"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="rec-new-pin" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Master PIN (Min 4 characters)
                </label>
                <input
                  id="rec-new-pin"
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Enter new master PIN"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="rec-confirm-pin" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm New PIN
                </label>
                <input
                  id="rec-confirm-pin"
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Confirm new master PIN"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                />
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Restore Console Access</span>}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('unlock');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 underline font-medium"
                >
                  Return to normal unlock
                </button>
              </div>
            </form>
          )}

          {/* Privacy & Anti-Tamper Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-700 block">Strict Zero-Trust Local Authentication</span>
            <p className="leading-relaxed">
              Console credentials are PBKDF2-salted, validated strictly on the local machine with rate-limited brute-force locks, and never stored in the browser.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-6 text-center text-xs text-slate-500 space-y-1">
        <div>Personal Cybersecurity Bot · Loopback IPC (127.0.0.1)</div>
        <div className="text-[11px] text-slate-400">Strict local storage isolation · Zero cloud credential leakage</div>
      </footer>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  LogOut,
  Save,
  KeyRound,
  Phone,
  Globe,
  Lock,
} from 'lucide-react';
import { api } from '../api/client';
import { UserProfile, UserRole } from '../types/security';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  deviceName?: string;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onSignOut,
  deviceName = 'DESKTOP-SECURE-PC',
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState<UserProfile>({
    id: localStorage.getItem('pcb_user_id') || 'usr-local',
    fullName: localStorage.getItem('pcb_user_name') || 'Local Administrator',
    email: localStorage.getItem('pcb_user_email') || 'admin@shieldlabs.local',
    phone: localStorage.getItem('pcb_user_phone') || '',
    country: localStorage.getItem('pcb_user_country') || '',
    role: (localStorage.getItem('pcb_user_role') as UserRole) || 'ADMIN',
    deviceName: localStorage.getItem('pcb_device_name') || deviceName,
  });

  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone || '');
  const [country, setCountry] = useState(profile.country || '');
  const [devName, setDevName] = useState(profile.deviceName || deviceName);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync profile when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(true);

      api
        .getUserProfile()
        .then((data) => {
          if (data) {
            setProfile(data);
            if (data.fullName) setFullName(data.fullName);
            if (data.email) setEmail(data.email);
            if (data.phone) setPhone(data.phone);
            if (data.country) setCountry(data.country);
            if (data.deviceName) setDevName(data.deviceName);
          }
        })
        .catch(() => {
          // Fallback to local storage values
          const localName = localStorage.getItem('pcb_user_name');
          const localEmail = localStorage.getItem('pcb_user_email');
          const localPhone = localStorage.getItem('pcb_user_phone');
          const localCountry = localStorage.getItem('pcb_user_country');
          if (localName) setFullName(localName);
          if (localEmail) setEmail(localEmail);
          if (localPhone) setPhone(localPhone);
          if (localCountry) setCountry(localCountry);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  // Keyboard shortcut: ESC closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid email address is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await api.updateUserProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: country.trim(),
        deviceName: devName.trim(),
      } as any);

      localStorage.setItem('pcb_user_name', fullName.trim());
      localStorage.setItem('pcb_user_email', email.trim());
      localStorage.setItem('pcb_user_phone', phone.trim());
      localStorage.setItem('pcb_user_country', country.trim());
      localStorage.setItem('pcb_device_name', devName.trim());

      const updatedProf: UserProfile = {
        ...profile,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: country.trim(),
        deviceName: devName.trim(),
      };
      setProfile(updatedProf);
      if (onProfileUpdated) {
        onProfileUpdated(updatedProf);
      }

      setSuccessMessage('Profile saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeStyle = (r: UserRole) => {
    switch (r) {
      case 'ADMIN':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'SECURITY_ANALYST':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'AUDITOR':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'NO_ROLE':
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
              {(fullName || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 id="user-profile-modal-title" className="text-base font-bold text-slate-900">
                User Profile & Security Access
              </h2>
              <p className="text-xs text-slate-500">
                Manage your credentials, role privileges, and active session
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Profile Modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Loading user profile…</span>
            </div>
          ) : (
            <>
              {/* Full Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@shieldlabs.local"
                    className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0199 / +91 98765 43210"
                    className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Country</label>
                <div className="relative">
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States, India, Germany"
                    className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Role & Authority (Strictly Managed by Master Admin) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Assigned Security Clearance</span>
                  <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Managed by Master Admin
                  </span>
                </label>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getRoleBadgeStyle(profile.role)}`}>
                        {profile.role === 'ADMIN' ? '👑 Master Administrator' : profile.role === 'SECURITY_ANALYST' ? '🛡️ Security Analyst' : profile.role === 'AUDITOR' ? '📋 Compliance Auditor' : 'Restricted (No Role)'}
                      </span>
                      {profile.isVerified && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          OTP Verified
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {profile.role === 'ADMIN'
                        ? 'Master Admin has full system control and assigns roles to other users in User Management.'
                        : 'Your default role is Security Analyst. Only Master Admin can modify clearance roles.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Managed Device Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registered Device Hostname</label>
                <div className="relative">
                  <input
                    type="text"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <Laptop className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Session Security Indicator */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-semibold text-slate-800">Loopback IPC Secure Session</div>
                    <div className="text-slate-500 font-mono">Bound to 127.0.0.1 / Local PC</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getRoleBadgeStyle(profile.role)}`}>
                  {profile.role}
                </span>
              </div>
            </>
          )}

          {/* Action Cluster */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-3">
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out / Lock
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

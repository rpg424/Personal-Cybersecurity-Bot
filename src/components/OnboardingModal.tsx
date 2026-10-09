import React, { useState } from 'react';
import { Lock, CheckCircle2, Shield, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface OnboardingModalProps {
  isOpen: boolean;
  onCompleted: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onCompleted }) => {
  const [consentGiven, setConsentGiven] = useState(false);
  const [permissionProfile, setPermissionProfile] = useState<'balanced' | 'strict'>('balanced');
  const [cloudOptIn, setCloudOptIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!consentGiven) return;
    setIsSubmitting(true);
    try {
      await api.enroll({
        consent_given: true,
        permission_profile: permissionProfile,
        cloud_assistance_opt_in: cloudOptIn,
      });
      onCompleted();
    } catch (err) {
      console.error('Enrollment failed:', err);
      onCompleted();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 id="onboarding-title" className="text-lg font-bold text-slate-900 tracking-tight">
              Welcome to Shield Labs Bot
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Calm, defensive protection designed for your Windows desktop.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-800">
          {/* Core Commitments */}
          <div className="space-y-3">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">
              Our Defensive & Privacy Guarantees
            </span>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Coexists with Windows Defender:</strong> We do not disable or replace Microsoft's built-in defenses; we add an extra layer of plain-language monitoring.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <EyeOff className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">100% Offline Core Protection:</strong> Your alerts, files, and activity history never leave this computer. No cloud upload by default.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Safe Actions with Full Reversibility:</strong> Files are never deleted without your approval. Quarantined files can be previewed and restored at any time.
                </p>
              </div>
            </div>
          </div>

          {/* Setup Options */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">
              Select Your Protection Profile
            </span>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPermissionProfile('balanced')}
                className={`p-3 rounded-xl border text-left transition-colors shadow-2xs ${
                  permissionProfile === 'balanced'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-xs mb-1 text-slate-900">Balanced (Recommended)</div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  Standard alerts for living-off-the-land commands and canary trips.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPermissionProfile('strict')}
                className={`p-3 rounded-xl border text-left transition-colors shadow-2xs ${
                  permissionProfile === 'strict'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-xs mb-1 text-slate-900">Strict / Solo Pro</div>
                <div className="text-[11px] text-slate-500 leading-normal">
                  Aggressive inspection for unsigned scripts and USB drives.
                </div>
              </button>
            </div>
          </div>

          {/* Cloud Assistance Opt-In */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cloudOptIn}
                onChange={(e) => setCloudOptIn(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
              />
              <div>
                <span className="text-slate-900 font-bold text-xs block">
                  Enable Plain-English Cloud Assistant (Optional)
                </span>
                <span className="text-slate-500 text-[11px] leading-normal block mt-0.5">
                  Allows conversational AI explanations for alerts. Core monitoring and telemetry remain strictly on this PC.
                </span>
              </div>
            </label>
          </div>

          {/* Consent Checkbox */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
              />
              <span className="text-slate-700 leading-relaxed text-xs">
                I understand the defensive boundaries and authorize Shield Labs Bot to monitor my local processes, downloads, and decoy canary files.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <span className="text-[11px] text-slate-500 font-mono">127.0.0.1 Loopback Isolation</span>

          <button
            onClick={handleSubmit}
            disabled={!consentGiven || isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Complete Enrollment</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

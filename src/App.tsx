/**
 * Personal Cybersecurity Bot - Main Application Shell
 * Desktop-first, calm security console with light theme & device-owner authentication
 */

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TopBar } from './components/TopBar';
import { StatusCockpit } from './components/StatusCockpit';
import { AlertCenter } from './components/AlertCenter';
import { AlertDetailModal } from './components/AlertDetailModal';
import { GuidedResponseWizard } from './components/GuidedResponseWizard';
import { TimelineView } from './components/TimelineView';
import { RecoveryCenter } from './components/RecoveryCenter';
import { PanicModal } from './components/PanicModal';
import { SettingsModal } from './components/SettingsModal';
import { AssistantChatDrawer } from './components/AssistantChatDrawer';
import { OnboardingModal } from './components/OnboardingModal';
import { LoginPage } from './components/LoginPage';
import { HardwareSafetyInspector } from './components/HardwareSafetyInspector';
import { FleetManagerView } from './components/FleetManagerView';
import { SecondUserJoinView } from './components/SecondUserJoinView';
import { api } from './api/client';
import { AlertItem, EventEnvelope, PrivacySettings } from './types/security';
import { AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 3000,
      retry: 2,
    },
  },
});

function ConsoleApp() {
  const qc = useQueryClient();
  const [currentTab, setCurrentTab] = useState<string>('fleet');
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [wizardConfig, setWizardConfig] = useState<{
    isOpen: boolean;
    actionType: 'stop' | 'quarantine';
    target: string;
    alert: AlertItem | null;
  }>({
    isOpen: false,
    actionType: 'stop',
    target: '',
    alert: null,
  });

  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantContextAlert, setAssistantContextAlert] = useState<AlertItem | null>(null);
  const [isStreamConnected, setIsStreamConnected] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isConsoleUnlocked, setIsConsoleUnlocked] = useState(false);

  // Check auth session
  const { data: authSession, refetch: refetchAuthSession } = useQuery({
    queryKey: ['auth_session'],
    queryFn: api.getAuthSession,
    refetchInterval: 15000,
  });

  useEffect(() => {
    // Zero-trust browser policy: Never store or inspect plaintext credentials in client storage
    localStorage.removeItem('pcb_saved_pin');

    if (authSession) {
      if (!authSession.is_locked && !authSession.is_locked_out) {
        setIsConsoleUnlocked(true);
      } else {
        setIsConsoleUnlocked(false);
      }
    }
  }, [authSession]);

  // Queries (only when console is unlocked)
  const { data: enrollment } = useQuery({
    queryKey: ['enrollment'],
    queryFn: api.getEnrollment,
    enabled: isConsoleUnlocked,
  });

  useEffect(() => {
    if (enrollment && !enrollment.is_enrolled) {
      setShowOnboarding(true);
    }
  }, [enrollment]);

  const {
    data: statusData,
    isLoading: isStatusLoading,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['status'],
    queryFn: api.getStatus,
    refetchInterval: 8000,
    enabled: isConsoleUnlocked,
  });

  const {
    data: alertsData,
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts({ state: 'all' }),
    refetchInterval: 10000,
    enabled: isConsoleUnlocked,
  });

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['history'],
    queryFn: () => api.getHistory(1, 50),
    refetchInterval: 10000,
    enabled: isConsoleUnlocked,
  });

  const {
    data: reportData,
    isLoading: isReportLoading,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['report'],
    queryFn: api.getReport,
    enabled: isConsoleUnlocked,
  });

  const {
    data: recoveryData,
    isLoading: isRecoveryLoading,
    refetch: refetchRecovery,
  } = useQuery({
    queryKey: ['recovery'],
    queryFn: api.getRecoveryItems,
    enabled: isConsoleUnlocked,
  });

  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
    enabled: isConsoleUnlocked,
  });

  // Real-time SSE Stream Listener
  useEffect(() => {
    if (!isConsoleUnlocked) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/v1/events/stream');
      eventSource.onopen = () => {
        setIsStreamConnected(true);
      };
      eventSource.addEventListener('security_event', (event: MessageEvent) => {
        try {
          const envelope: EventEnvelope = JSON.parse(event.data);
          qc.invalidateQueries({ queryKey: ['status'] });
          qc.invalidateQueries({ queryKey: ['alerts'] });
          qc.invalidateQueries({ queryKey: ['history'] });
          qc.invalidateQueries({ queryKey: ['recovery'] });
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      });
      eventSource.onerror = () => {
        setIsStreamConnected(false);
      };
    } catch (err) {
      console.error('SSE initialization error:', err);
      setIsStreamConnected(false);
    }

    return () => {
      eventSource?.close();
    };
  }, [isConsoleUnlocked, qc]);

  // Simulation Mutation
  const simulationMutation = useMutation({
    mutationFn: api.runSimulation,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['status'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      setSelectedAlert(data.alert);
    },
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: (quarantineId: string) =>
      api.restoreFile({
        quarantine_id: quarantineId,
        idempotency_key: `restore-${Date.now()}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recovery'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });

  // Purge Single Quarantine Item Mutation
  const purgeItemMutation = useMutation({
    mutationFn: (quarantineId: string) => api.purgeQuarantineItem(quarantineId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recovery'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });

  // Settings Mutation
  const settingsMutation = useMutation({
    mutationFn: (updated: Partial<PrivacySettings>) => api.updateSettings(updated),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });

  // Purge Mutation
  const purgeMutation = useMutation({
    mutationFn: api.deleteAllData,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status'] });
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['recovery'] });
    },
  });

  // Lock Console Handler
  const handleLockConsole = async () => {
    localStorage.removeItem('pcb_remember_session');
    localStorage.removeItem('pcb_saved_pin');
    try {
      await api.lockConsole();
    } catch {
      // ignore
    }
    setIsConsoleUnlocked(false);
    qc.invalidateQueries({ queryKey: ['auth_session'] });
  };

  // If not unlocked, render the Login Page!
  if (!isConsoleUnlocked) {
    return (
      <LoginPage
        userName={authSession?.user_name || 'Device Owner (Local Administrator)'}
        deviceName={authSession?.device_name || 'DESKTOP-SECURE-PC'}
        hasConfiguredPin={authSession?.has_configured_pin}
        onLoginSuccess={() => {
          setIsConsoleUnlocked(true);
          refetchAuthSession();
          qc.invalidateQueries({ queryKey: ['status'] });
        }}
      />
    );
  }

  const alerts = alertsData?.alerts || [];
  const unresolvedCount = alerts.filter((a) => a.state === 'unresolved').length;
  const isNetworkIsolated = statusData?.label.includes('Panic') || false;

  const handleOpenActionWizard = (actionType: 'stop' | 'quarantine', target: string, alert: AlertItem) => {
    setSelectedAlert(null);
    setWizardConfig({
      isOpen: true,
      actionType,
      target,
      alert,
    });
  };

  const handleAskAssistant = (alert?: AlertItem) => {
    setAssistantContextAlert(alert || null);
    setIsAssistantOpen(true);
  };

  const handleExportData = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PersonalCybersecurityBot_Export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit data:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Bar Contract (Wordmark, Nav Links, Action Cluster, Lock Button) */}
      <TopBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        statusCode={statusData?.status_code || 'unknown'}
        statusLabel={statusData?.label || 'Verifying Authority...'}
        onOpenPanic={() => setIsPanicOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAssistant={() => handleAskAssistant()}
        onLockConsole={handleLockConsole}
        unresolvedCount={unresolvedCount}
      />

      {/* Emergency Network Panic Banner */}
      {isNetworkIsolated && (
        <aside
          role="alert"
          aria-live="assertive"
          className="bg-rose-50 border-b border-rose-200 text-rose-900 px-6 py-2.5 flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Emergency Panic Mode Active:</strong> Non-local internet adapters are currently isolated. Local protection IPC remains active.
            </span>
          </div>
          <button
            onClick={() => setIsPanicOpen(true)}
            className="px-3 py-1 font-semibold bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors shrink-0 shadow-2xs"
          >
            Restore Connectivity
          </button>
        </aside>
      )}

      {/* Service Connection Error Notice */}
      {isStatusError && (
        <div
          role="alert"
          className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-2 flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Connecting to local protection service on 127.0.0.1...</span>
          </div>
          <button
            onClick={() => refetchStatus()}
            className="flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-950"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {currentTab === 'home' && (
          <StatusCockpit
            statusData={statusData}
            isLoading={isStatusLoading}
            onOpenAlerts={() => setCurrentTab('alerts')}
            onRunSimulation={(scenario) => simulationMutation.mutate(scenario)}
            isSimulating={simulationMutation.isPending}
            onOpenSafetyHardware={() => setCurrentTab('safety-hardware')}
          />
        )}

        {currentTab === 'safety-hardware' && (
          <HardwareSafetyInspector />
        )}

        {currentTab === 'fleet' && (
          <FleetManagerView />
        )}

        {currentTab === 'alerts' && (
          <AlertCenter
            alerts={alerts}
            isLoading={isAlertsLoading}
            onSelectAlert={(a) => setSelectedAlert(a)}
            onQuickAction={(action, alert) => {
              const target =
                action === 'stop'
                  ? alert.evidence.process_name || `PID:${alert.evidence.pid}`
                  : alert.evidence.destination_path || 'unknown_target';
              handleOpenActionWizard(action, target, alert);
            }}
            onRefresh={() => refetchAlerts()}
          />
        )}

        {currentTab === 'timeline' && (
          <TimelineView
            events={historyData?.events || []}
            isLoading={isHistoryLoading}
            onRefresh={() => refetchHistory()}
            isStreamConnected={isStreamConnected}
          />
        )}

        {currentTab === 'recovery' && (
          <RecoveryCenter
            items={recoveryData?.items || []}
            isLoading={isRecoveryLoading}
            onRestore={(qid) => restoreMutation.mutate(qid)}
            onPurgeItem={(qid) => purgeItemMutation.mutate(qid)}
            onRefresh={() => refetchRecovery()}
          />
        )}
      </main>

      {/* Modals & Slide-out Drawers */}
      <AlertDetailModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onStartAction={(actionType, target, alert) => {
          handleOpenActionWizard(actionType as 'stop' | 'quarantine', target, alert);
        }}
        onAskAssistantAboutAlert={(alert) => {
          setSelectedAlert(null);
          handleAskAssistant(alert);
        }}
      />

      {wizardConfig.isOpen && (
        <GuidedResponseWizard
          actionType={wizardConfig.actionType}
          target={wizardConfig.target}
          alert={wizardConfig.alert}
          onClose={() =>
            setWizardConfig((prev) => ({
              ...prev,
              isOpen: false,
            }))
          }
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['status'] });
            qc.invalidateQueries({ queryKey: ['alerts'] });
            qc.invalidateQueries({ queryKey: ['history'] });
            qc.invalidateQueries({ queryKey: ['recovery'] });
          }}
        />
      )}

      {isPanicOpen && (
        <PanicModal
          isIsolated={isNetworkIsolated}
          onClose={() => setIsPanicOpen(false)}
          onStateChanged={() => {
            qc.invalidateQueries({ queryKey: ['status'] });
            qc.invalidateQueries({ queryKey: ['history'] });
          }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settingsData}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(updated) => settingsMutation.mutate(updated)}
          onPurgeAll={() => purgeMutation.mutate()}
        />
      )}

      <AssistantChatDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        contextAlert={assistantContextAlert}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onCompleted={() => {
          setShowOnboarding(false);
          qc.invalidateQueries({ queryKey: ['enrollment'] });
          qc.invalidateQueries({ queryKey: ['status'] });
        }}
      />
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isJoinRoute = currentPath.startsWith('/join') || currentPath.startsWith('/client');

  return (
    <QueryClientProvider client={queryClient}>
      {isJoinRoute ? <SecondUserJoinView /> : <ConsoleApp />}
    </QueryClientProvider>
  );
}

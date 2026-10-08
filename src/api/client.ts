/**
 * Personal Cybersecurity Bot - Authenticated IPC Client (127.0.0.1)
 * Enforces bearer token auth, typed responses, and error handling.
 */

import {
  ProtectionStatusResponse,
  CapabilitiesResponse,
  AlertsResponse,
  AlertItem,
  OperationRecord,
  OperationPreviewData,
  WeeklyReportSummary,
  PrivacySettings,
  LocalEnrollmentState,
  ConsoleAuthSession,
  QuarantineItem,
  EventEnvelope,
  ResearchFinding,
  EvidenceCard,
  AnalystReviewStatus,
  ResearchSelfTestResult,
  SecuritySelfTestResult,
  AccountRecoveryResponse,
  HardwareTelemetryResponse,
  SecurityPostureResponse,
  SafetyVerdictResponse,
  RemoteNodeProbeResponse,
  HostNetworkTelemetry,
  FleetNode,
  FleetSummary,
  EnrollFleetNodeRequest,
  ClientTransparencyStatus,
  SecondUserJoinPayload,
} from '../types/security';

let cachedToken: string | null = null;

export async function getIpcToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  try {
    const res = await fetch('/api/v1/enrollment');
    if (!res.ok) throw new Error('Failed to reach local security authority');
    const data = await res.json();
    cachedToken = data.active_token || data.ipc_token;
    return cachedToken!;
  } catch (err) {
    console.error('[Personal Cybersecurity Bot] Token discovery error:', err);
    return '';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getIpcToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    throw new Error(errorData.message || errorData.error || `Request failed with ${response.status}`);
  }

  return response.json();
}

export const api = {
  getEnrollment: () => fetch('/api/v1/enrollment').then((r) => r.json() as Promise<LocalEnrollmentState & { active_token: string }>),
  
  enroll: (data: { consent_given: boolean; permission_profile: string; cloud_assistance_opt_in: boolean }) =>
    fetch('/api/v1/enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  getStatus: () => request<ProtectionStatusResponse>('/api/v1/status'),
  
  getCapabilities: () => request<CapabilitiesResponse>('/api/v1/capabilities'),
  
  getAlerts: (params?: { state?: string; severity?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.state) query.set('state', params.state);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());
    return request<AlertsResponse>(`/api/v1/alerts?${query.toString()}`);
  },

  getAlertById: (id: string) => request<AlertItem>(`/api/v1/alerts/${id}`),

  previewAction: (data: { action_type: string; target: string; alert_id?: string }) =>
    request<OperationPreviewData>('/api/v1/actions/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  stopProcess: (data: { target: string; alert_id?: string; idempotency_key: string }) =>
    request<OperationRecord>('/api/v1/actions/stop', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  quarantineFile: (data: { target: string; alert_id?: string; idempotency_key: string }) =>
    request<OperationRecord>('/api/v1/actions/quarantine', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  triggerPanic: (enable_isolation: boolean, idempotency_key: string) =>
    request<OperationRecord>('/api/v1/actions/panic', {
      method: 'POST',
      body: JSON.stringify({ enable_isolation, idempotency_key }),
    }),

  restoreFile: (data: { quarantine_id: string; destination_path?: string; idempotency_key: string }) =>
    request<OperationRecord>('/api/v1/actions/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  purgeQuarantineItem: (quarantineId: string) =>
    request<{ success: boolean; message: string; quarantine_id: string }>(
      `/api/v1/actions/quarantine/${encodeURIComponent(quarantineId)}`,
      { method: 'DELETE' }
    ),

  getHistory: (page = 1, pageSize = 20) =>
    request<{ events: EventEnvelope[]; total: number; page: number; pageSize: number }>(
      `/api/v1/history?page=${page}&pageSize=${pageSize}`
    ),

  getReport: () => request<WeeklyReportSummary>('/api/v1/report'),

  getRecoveryItems: () => request<{ items: QuarantineItem[] }>('/api/v1/recovery'),

  getSettings: () => request<PrivacySettings>('/api/v1/settings/privacy'),

  updateSettings: (settings: Partial<PrivacySettings>) =>
    request<{ success: boolean; settings: PrivacySettings }>('/api/v1/settings/privacy', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  getHealth: () => request<{ status: string; health: any; isolation_active: boolean }>('/api/v1/health'),

  getAuthSession: () => fetch('/api/v1/auth/session').then((r) => r.json() as Promise<ConsoleAuthSession>),

  setupConsole: (pin: string, userName?: string, deviceName?: string) =>
    fetch('/api/v1/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, userName, deviceName }),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || data.error || 'Failed to setup console PIN');
      cachedToken = data.token;
      return data;
    }),

  unlockConsole: (pin: string) =>
    fetch('/api/v1/auth/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || data.error || 'Failed to unlock console');
      cachedToken = data.token;
      return data;
    }),

  lockConsole: () =>
    fetch('/api/v1/auth/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then((r) => r.json()),

  updateUserProfile: (userName: string, deviceName: string) =>
    request<{ success: boolean; user_name: string; device_name: string }>('/api/v1/auth/user-profile', {
      method: 'POST',
      body: JSON.stringify({ user_name: userName, device_name: deviceName }),
    }),

  changePin: (currentPin: string, newPin: string) =>
    request<{ success: boolean; message: string }>('/api/v1/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
    }),

  recoverConsole: (recoveryKey: string, newPin: string) =>
    fetch('/api/v1/auth/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recovery_key: recoveryKey, new_pin: newPin }),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || data.error || 'Failed to recover console');
      cachedToken = data.token;
      return data as AccountRecoveryResponse;
    }),

  runSecuritySelfTest: () =>
    request<SecuritySelfTestResult>('/api/v1/security/self-test', {
      method: 'POST',
    }),

  runSimulation: (scenario: 'ransomware_canary' | 'lolbin_command' | 'phishing_link') =>
    request<{ success: boolean; alert: AlertItem }>('/api/v1/simulations/run', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    }),

  deleteAllData: () =>
    request<{ success: boolean; message: string }>('/api/v1/data/delete-all', {
      method: 'POST',
    }),

  exportData: () => request<any>('/api/v1/data/export'),

  queryResearch: (query: string, indicator_type?: string) =>
    request<ResearchFinding>('/api/v1/research/query', {
      method: 'POST',
      body: JSON.stringify({ query, indicator_type }),
    }),

  getResearchHistory: () =>
    request<{ findings: ResearchFinding[]; total: number; retention_days: number }>('/api/v1/research/history'),

  submitResearchFeedback: (data: {
    finding_id: string;
    card_id: string;
    review_status?: AnalystReviewStatus;
    note?: string;
  }) =>
    request<{ success: boolean; card: EvidenceCard }>('/api/v1/research/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  attachResearchToAlert: (data: {
    finding_id: string;
    card_id: string;
    alert_id: string;
    note?: string;
  }) =>
    request<{ success: boolean; message: string; alert: AlertItem }>('/api/v1/research/attach-to-alert', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  runResearchSelfTest: () =>
    request<ResearchSelfTestResult>('/api/v1/research/self-test', {
      method: 'POST',
    }),

  exportResearchData: () => request<any>('/api/v1/research/export'),

  deleteResearchHistory: () =>
    request<{ success: boolean; message: string }>('/api/v1/research/history', {
      method: 'DELETE',
    }),

  askSecurityAssistant: (
    message: string,
    contextAlert?: AlertItem,
    conversationHistory?: Array<{ sender: string; text: string }>
  ) =>
    fetch('/api/bot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, contextAlert, conversationHistory }),
    }).then((r) => r.json() as Promise<{ reply: string; is_fallback: boolean }>),

  createBackup: () =>
    request<{ success: boolean; backup: any }>('/api/v1/data/backup', {
      method: 'POST',
    }),

  restoreBackup: (backup: any) =>
    request<{ success: boolean; message: string; alerts_count: number; events_count: number }>('/api/v1/data/restore-backup', {
      method: 'POST',
      body: JSON.stringify({ backup }),
    }),

  validateUrl: (url: string, redirect_target?: string) =>
    request<{ allowed: boolean; reason?: string; destinationHost?: string }>('/api/v1/research/validate-url', {
      method: 'POST',
      body: JSON.stringify({ url, redirect_target }),
    }),

  getHardwareTelemetry: () => request<HardwareTelemetryResponse>('/api/v1/hardware/deep-telemetry'),

  getSecurityPosture: () => request<SecurityPostureResponse>('/api/v1/security/posture'),

  getSafetyVerdict: () => request<SafetyVerdictResponse>('/api/v1/security/safety-verdict'),

  probeRemoteNode: (host: string, customPorts?: number[]) =>
    request<RemoteNodeProbeResponse>('/api/v1/network/probe-node', {
      method: 'POST',
      body: JSON.stringify({ host, customPorts }),
    }),

  getNetworkInterfaces: () => request<HostNetworkTelemetry>('/api/v1/network/interfaces'),
  getFleetNodes: () => request<{ nodes: FleetNode[]; summary: FleetSummary }>('/api/v1/fleet/nodes'),
  enrollFleetNode: (data: EnrollFleetNodeRequest) =>
    request<{ success: boolean; node: FleetNode; message: string }>('/api/v1/fleet/enroll', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  scanFleetNode: (nodeId: string) =>
    request<{ success: boolean; node: FleetNode; message: string }>(`/api/v1/fleet/nodes/${encodeURIComponent(nodeId)}/scan`, {
      method: 'POST',
    }),
  deleteFleetNode: (nodeId: string) =>
    request<{ success: boolean; message: string }>(`/api/v1/fleet/nodes/${encodeURIComponent(nodeId)}`, {
      method: 'DELETE',
    }),
  getClientTransparencyStatus: () =>
    fetch('/api/v1/fleet/client-status').then((r) => r.json() as Promise<ClientTransparencyStatus>),
  joinFleetEndpoint: (data: SecondUserJoinPayload) =>
    fetch('/api/v1/fleet/join-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json() as Promise<{ success: boolean; node: FleetNode; message: string }>),
  getAgentScript: () =>
    fetch('/api/v1/fleet/agent-script').then((r) => r.json() as Promise<{ powershellOneLiner: string; manualInstructions: string }>),
};

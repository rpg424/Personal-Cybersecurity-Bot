/**
 * Shield Labs Bot - Shared Types & Contracts
 * Compliant with API and Event Specification v1.0.0
 */

export type StatusCode = 'green' | 'yellow' | 'red' | 'unknown';
export type TelemetryStatus = 'Live' | 'Demo' | 'Unavailable';

export interface CoverageItem {
  id: string;
  name: string;
  status: 'active' | 'degraded' | 'unknown' | 'mocked';
  last_checked_utc: string;
  details: string;
  telemetry_status?: TelemetryStatus;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'safe_mode';
  cpu_percent: number;
  memory_mb: number;
  uptime_seconds: number;
  database_status: 'ok' | 'degraded' | 'recovering';
  queue_size: number;
  cpu_telemetry_status?: TelemetryStatus;
  memory_telemetry_status?: TelemetryStatus;
  uptime_telemetry_status?: TelemetryStatus;
  vault_telemetry_status?: TelemetryStatus;
  ipc_telemetry_status?: TelemetryStatus;
}

export interface ProtectionStatusResponse {
  status_code: StatusCode;
  label: string;
  explanation: string;
  coverage_items: CoverageItem[];
  last_verified_at_utc: string;
  unknown_reasons: string[];
  service_health: ServiceHealth;
  recommended_next_step: string;
}

export interface CapabilityItem {
  id: string;
  name: string;
  state: 'active' | 'degraded' | 'mocked' | 'unsupported';
  requires_elevation: boolean;
  rollback_supported: boolean;
  description: string;
}

export interface CapabilitiesResponse {
  capabilities: CapabilityItem[];
}

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type AlertState = 'unresolved' | 'resolved' | 'dismissed';

export interface AlertEvidence {
  process_name?: string;
  pid?: number;
  command_line?: string;
  parent_process?: string;
  destination_path?: string;
  file_hash_sha256?: string;
  source_ip?: string;
  destination_ip?: string;
  target_url?: string;
  matched_rules?: string[];
  [key: string]: unknown;
}

export interface AlertTimelineItem {
  timestamp_utc: string;
  description: string;
  severity?: AlertSeverity;
}

export interface AlertItem {
  id: string;
  title: string;
  severity: AlertSeverity;
  state: AlertState;
  detector_id: string;
  detector_version: string;
  created_at_utc: string;
  confidence: number;
  confidence_rationale: string;
  plain_language_summary: string;
  why_risky: string;
  what_product_did: string;
  recommendation: string;
  evidence: AlertEvidence;
  timeline: AlertTimelineItem[];
  supported_actions: string[];
  research_attachments?: EvidenceCard[];
}

export interface AlertsResponse {
  alerts: AlertItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type OperationStatus =
  | 'requested'
  | 'previewed'
  | 'awaiting_confirmation'
  | 'authorized'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'timed_out'
  | 'cancelled'
  | 'unknown';

export interface OperationPreviewData {
  target: string;
  action_type: string;
  impact_summary: string;
  processes_affected?: string[];
  network_effects?: string;
  file_destinations?: string;
  rollback_possible: boolean;
  warning_level: 'none' | 'moderate' | 'high' | 'emergency';
}

export interface OperationRecord {
  operation_id: string;
  idempotency_key: string;
  status: OperationStatus;
  actor: string;
  target: string;
  scope: string;
  capability: string;
  reason_code: string;
  requested_at_utc: string;
  expires_at_utc: string;
  timeout_ms: number;
  rollback_supported: boolean;
  rollback_result?: string | null;
  audit_event_id: string;
  message?: string;
  preview_data?: OperationPreviewData;
}

export interface EventEnvelope {
  event_id: string;
  schema_version: string;
  event_type: string;
  occurred_at_utc: string;
  observed_at_utc: string;
  sequence: number;
  correlation_id: string;
  source: string;
  object_ref: string;
  severity: AlertSeverity;
  confidence: number;
  coverage_state: string;
  redacted_evidence_refs: string[];
  retention_class: 'security_audit' | 'transient_telemetry' | 'quarantine_ledger';
  payload: Record<string, unknown>;
}

export interface QuarantineItem {
  quarantine_id: string;
  original_path: string;
  vault_storage_path: string;
  file_size_bytes: number;
  sha256_hash: string;
  quarantined_at_utc: string;
  associated_alert_id?: string;
  restored_at_utc?: string | null;
  restoration_path?: string | null;
  is_restorable: boolean;
  risk_notes: string;
}

export interface WeeklyReportSummary {
  week_start_utc: string;
  week_end_utc: string;
  total_events_observed: number;
  threats_neutralized: number;
  active_quarantine_count: number;
  coverage_percentage: number;
  system_stability_score: number;
  top_observations: string[];
  recommended_actions: string[];
  limitations: string[];
}

export interface PrivacySettings {
  local_only_mode: boolean;
  cloud_assistance_opt_in: boolean;
  retention_days: number;
  telemetry_anonymization: boolean;
  browser_inspection_scope: 'download_only' | 'url_heuristic' | 'disabled';
  usb_auto_inspect: boolean;
  canary_honeytokens_enabled: boolean;
  reduced_motion_mode: boolean;
  high_contrast_mode: boolean;
  text_scale_percent: number;
  suppressions: Array<{
    id: string;
    detector_id: string;
    pattern: string;
    reason: string;
    expires_at_utc: string;
  }>;
}

export interface LocalEnrollmentState {
  is_enrolled: boolean;
  installation_id: string;
  device_name: string;
  enrolled_at_utc: string | null;
  ipc_token: string;
  permission_profile: 'balanced' | 'strict' | 'relaxed';
  defender_coexistence_state: 'optimal' | 'passive' | 'warning';
}

export interface ConsoleAuthSession {
  is_locked: boolean;
  is_locked_out: boolean;
  lockout_remaining_seconds: number;
  user_name: string;
  device_name: string;
  email?: string;
  role?: UserRole;
  has_configured_pin: boolean;
  active_users_count?: number;
}

export type EvidenceClassification = 'Confirmed' | 'Reported' | 'Inferred' | 'Contradicted' | 'Stale' | 'Synthetic';
export type SourceTrustLevel = 'Official / Authoritative' | 'Community Threat Intel' | 'Vendor Advisory' | 'Unverified Public Source' | 'Synthetic Fixture';
export type AnalystReviewStatus = 'Relevant' | 'False positive' | 'Stale' | 'Contradicted' | 'Unresolved';

export interface EvidenceCard {
  id: string;
  direct_quote_or_fact: string;
  source_name: string;
  exact_url: string;
  redirect_destination?: string | null;
  publication_date_utc?: string | null;
  retrieval_timestamp_utc: string;
  source_type: string;
  trust_level: SourceTrustLevel;
  confidence: number; // 0.0 - 1.0
  classification: EvidenceClassification;
  analyst_notes?: string;
  review_status: AnalystReviewStatus;
  att_ck_tactics?: string[];
  attached_alert_id?: string;
}

export interface ResearchContradiction {
  id: string;
  claim_a: { source: string; claim: string };
  claim_b: { source: string; claim: string };
  plain_english_explanation: string;
  status: 'Needs review';
}

export interface WhatLeavesDeviceAudit {
  original_query: string;
  redacted_query: string;
  redactions_applied: string[];
  destination_host: string;
  timestamp_utc: string;
}

export interface ResearchFinding {
  id: string;
  query: string;
  indicator_type: 'url' | 'domain' | 'ip' | 'hash' | 'cve' | 'malware_name' | 'keyword';
  sanitized_query: string;
  what_left_device: WhatLeavesDeviceAudit;
  evidence_cards: EvidenceCard[];
  contradictions: ResearchContradiction[];
  stale_source_warning?: string;
  created_at_utc: string;
  is_synthetic: boolean;
  status: 'completed' | 'timeout' | 'offline' | 'rate_limited' | 'malformed_source' | 'permission_denied' | 'no_results' | 'failed';
  error_message?: string;
}

export interface ResearchSelfTestResult {
  passed: boolean;
  timestamp_utc: string;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
}

export interface GroundingCitation {
  title: string;
  url: string;
}

export interface AssistantChatResponse {
  reply: string;
  is_fallback: boolean;
  model_used?: string;
  citations?: GroundingCitation[];
}

export interface SecuritySelfTestCheck {
  id: string;
  name: string;
  category: 'auth' | 'authorization' | 'redaction' | 'audit' | 'privacy';
  passed: boolean;
  details: string;
}

export interface SecuritySelfTestResult {
  passed: boolean;
  timestamp_utc: string;
  environment: 'Demo / Synthetic Safe Sandbox';
  checks: SecuritySelfTestCheck[];
}

export interface AccountRecoveryResponse {
  success: boolean;
  message: string;
  token?: string;
  new_recovery_key?: string;
}

export interface StorageDrive {
  drive: string;
  totalGB: number;
  freeGB: number;
  usedPct: number;
  fileSystem: string;
}

export interface DeviceManagerEntity {
  name: string;
  status: string;
  alert: boolean;
}

export interface NetworkInterfaceDetail {
  name: string;
  ip: string;
  family: string;
  internal: boolean;
  mac: string;
  netmask: string;
  cidr: string | null;
}

export interface HostNetworkTelemetry {
  primaryIp: string;
  gateway: string;
  subnetMask: string;
  cidr: string;
  macAddress: string;
  interfaceName: string;
  allInterfaces: NetworkInterfaceDetail[];
}

export interface ConnectedUsbPeripheral {
  name: string;
  category: 'Mouse' | 'Keyboard' | 'USB Hub' | 'Peripheral';
  status: string;
  manufacturer?: string;
}

export interface HardwareTelemetryResponse {
  success: boolean;
  cpu: {
    model: string;
    cores: number;
    baseSpeedMHz: number;
    loadPct: number;
  };
  ram: {
    totalGB: number;
    usedGB: number;
    freeGB: number;
    usedPct: number;
  };
  storage: StorageDrive[];
  smartStatus: string;
  deviceErrors: DeviceManagerEntity[];
  usbPeripherals?: ConnectedUsbPeripheral[];
  uptimeHours: number;
  network?: HostNetworkTelemetry;
}

export interface ListeningPortInfo {
  protocol: string;
  address: string;
  port: number;
  pid: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PersistenceItem {
  name: string;
  targetPath: string;
  location: string;
  verified: boolean;
}

export interface SecurityPostureResponse {
  success: boolean;
  firewall: {
    enabled: boolean;
    domainProfile: string;
    publicProfile: string;
  };
  listeningPorts: ListeningPortInfo[];
  persistenceItems: PersistenceItem[];
}

export interface SafetyDeduction {
  reason: string;
  points: number;
  category: 'Threats' | 'Network' | 'Hardware' | 'System';
}

export interface SafetyVerdictResponse {
  success: boolean;
  safetyScore: number;
  verdict: 'SECURE & HEALTHY' | 'ACTION RECOMMENDED' | 'CRITICAL RISK';
  plainExplanation: string;
  deductions: SafetyDeduction[];
  recommendations: string[];
}

export interface RemoteServicePort {
  port: number;
  serviceName: string;
  isOpen: boolean;
  latencyMs?: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface RemoteNodeProbeRequest {
  host: string;
  customPorts?: number[];
}

export interface RemoteNodeProbeResponse {
  success: boolean;
  targetHost: string;
  isReachable: boolean;
  latencyMs: number;
  osFingerprint: string;
  openPorts: RemoteServicePort[];
  closedPortsCount: number;
  safetyScore: number;
  verdict: 'SECURE & HEALTHY' | 'ACTION RECOMMENDED' | 'CRITICAL RISK';
  recommendations: string[];
  scanTimestampUtc: string;
}

export interface HarmfulThreatDetail {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  threatType: string;
  severity: 'critical' | 'high' | 'medium';
  processName?: string;
  pid?: number;
  commandLine?: string;
  sha256?: string;
  detectedAtUtc: string;
  whyRisky: string;
  recommendation: string;
  status: 'unresolved' | 'quarantined' | 'stopped' | 'blocked';
}

export interface FleetNode {
  id: string;
  hostname: string;
  assignedUser: string;
  ipAddress: string;
  macAddress?: string;
  isLocal: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  safetyVerdict: 'SECURE & HEALTHY' | 'ACTION RECOMMENDED' | 'CRITICAL RISK';
  safetyScore: number;
  cpuPercent: number;
  ramPercent: number;
  totalRamGB: number;
  freeRamGB: number;
  activeForegroundApp: string;
  activeProcessesCount: number;
  harmfulFilesDetected: number;
  harmfulThreats?: HarmfulThreatDetail[];
  suspiciousBehaviorsCount: number;
  connectedLaptopsCount: number;
  monitoringMode: 'TRANSPARENT_MANAGED';
  userAcknowledged: boolean;
  timeLimit: 'UNLIMITED_CONTINUOUS';
  os: string;
  lastHeartbeatUtc: string;
  cpuModel?: string;
  cpuCores?: number;
  cpuSpeedMHz?: number;
  storageDrives?: Array<{ drive: string; totalGB: number; freeGB: number; usedPct: number }>;
  isAgentless?: boolean;
  openPorts?: RemoteServicePort[];
  recentActivity?: Array<{ timestampUtc: string; event: string; severity: 'low' | 'medium' | 'high' }>;
  activeBrowserUrl?: string;
  activeBrowserDomain?: string;
  activeBrowserVerdict?: 'SAFE' | 'SUSPICIOUS' | 'HARMFUL_BLOCKED';
  activeBrowserRiskScore?: number;
  activeBrowserCategory?: string;
  blockedDomains?: string[];
  allowedDomains?: string[];
  blockedFiles?: string[];
  deletedFiles?: string[];
  clientSessionId?: string;
}

export interface SecondUserJoinPayload {
  nodeId?: string;
  clientSessionId?: string;
  assignedUser: string;
  hostname?: string;
  cpuModel?: string;
  cpuCores?: number;
  cpuSpeedMHz?: number;
  cpuPercent?: number;
  ramPercent?: number;
  totalRamGB?: number;
  freeRamGB?: number;
  storageDrives?: Array<{ drive: string; totalGB: number; freeGB: number; usedPct: number }>;
  activeForegroundApp?: string;
  activeProcessesCount?: number;
  harmfulFilesDetected?: number;
  harmfulThreats?: HarmfulThreatDetail[];
  os?: string;
  activeBrowserUrl?: string;
  activeBrowserDomain?: string;
  activeBrowserVerdict?: 'SAFE' | 'SUSPICIOUS' | 'HARMFUL_BLOCKED';
  activeBrowserRiskScore?: number;
  activeBrowserCategory?: string;
}

export interface BlockDomainRequest {
  domain: string;
  reason?: string;
}

export interface BlockDomainResponse {
  success: boolean;
  message: string;
  nodeId: string;
  blockedDomains: string[];
}

export interface TriggerFileScanResponse {
  success: boolean;
  message: string;
  nodeId: string;
  scannedFilesCount: number;
  threatsFound: HarmfulThreatDetail[];
}

export interface FleetSummary {
  totalNodes: number;
  onlineNodes: number;
  healthyNodes: number;
  atRiskNodes: number;
  avgCpuPercent: number;
  avgRamPercent: number;
  totalHarmfulFiles: number;
  totalConnectedDevices: number;
}

export interface EnrollFleetNodeRequest {
  ipAddress: string;
  hostname?: string;
  assignedUser: string;
  userAcknowledged?: boolean;
}

export interface ClientTransparencyStatus {
  isManaged: boolean;
  managingConsole: string;
  clientIp: string;
  clientHostname: string;
  assignedUser: string;
  transparencyNotice: string;
  monitoringMode: string;
  timeLimit: string;
  scopeOfTelemetry: string[];
  privacyBoundaries: string[];
  lastHeartbeatUtc: string;
}

export type UserRole = 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' | 'NO_ROLE';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  role: UserRole;
  avatarUrl?: string;
  deviceName?: string;
  isVerified?: boolean;
  disabled?: boolean;
  isOnline?: boolean;
  createdAtUtc?: string;
  lastLoginUtc?: string;
}

export interface NodeRemediationCommand {
  id: string;
  nodeId: string;
  action: 'quarantine' | 'delete-file' | 'kill-process';
  targetPath?: string;
  targetPid?: number;
  threatId?: string;
  fileName?: string;
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  createdAtUtc: string;
  executedAtUtc?: string;
}

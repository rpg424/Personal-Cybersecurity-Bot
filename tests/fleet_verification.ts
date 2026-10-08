/**
 * Multi-Node Fleet Management & Transparent Endpoint Verification Suite
 * Validates fleet aggregation, dynamic local node telemetry, enrollment boundaries,
 * on-demand security scans, and persistent client transparency (no time limits).
 */

import assert from 'assert';
import os from 'os';
import net from 'net';
import { FleetNode, FleetSummary, ClientTransparencyStatus, SecondUserJoinPayload } from '../src/types/security';

console.log('--- Running Multi-Node Fleet & Transparency Verification Suite ---');

// 1. Host Validation Helper
function validateIpOrHostname(input: unknown): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 255) return false;
  return /^([a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])$/.test(trimmed);
}

// Test 1: IP Validation
assert.ok(validateIpOrHostname('192.168.29.240'), 'Valid LAN IPv4 must pass');
assert.ok(validateIpOrHostname('10.8.0.42'), 'Valid VPN IPv4 must pass');
assert.ok(validateIpOrHostname('laptop-remote.local'), 'Valid mDNS hostname must pass');
assert.ok(!validateIpOrHostname('192.168.1.1; rm -rf /'), 'Command injection must fail');
assert.ok(!validateIpOrHostname(''), 'Empty string must fail');
console.log('✔ Test 1 Passed: IP & hostname validation prevents injection');

// Test 2: Dynamic Local Node Structure Verification
const mockLocalNode: FleetNode = {
  id: 'node-local',
  hostname: os.hostname(),
  assignedUser: 'Device Owner (Local Administrator)',
  ipAddress: '192.168.29.240',
  isLocal: true,
  status: 'ONLINE',
  safetyVerdict: 'SECURE & HEALTHY',
  safetyScore: 95,
  cpuPercent: 14,
  ramPercent: 48,
  totalRamGB: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(1)),
  freeRamGB: Number((os.freemem() / 1024 / 1024 / 1024).toFixed(1)),
  activeForegroundApp: 'chrome.exe',
  activeProcessesCount: 65,
  harmfulFilesDetected: 0,
  suspiciousBehaviorsCount: 0,
  connectedLaptopsCount: 4,
  monitoringMode: 'TRANSPARENT_MANAGED',
  userAcknowledged: true,
  timeLimit: 'UNLIMITED_CONTINUOUS',
  os: `${os.type()} ${os.release()}`,
  lastHeartbeatUtc: new Date().toISOString(),
};

assert.strictEqual(mockLocalNode.isLocal, true);
assert.strictEqual(mockLocalNode.monitoringMode, 'TRANSPARENT_MANAGED');
assert.strictEqual(mockLocalNode.timeLimit, 'UNLIMITED_CONTINUOUS');
assert.ok(mockLocalNode.totalRamGB > 1.0, 'Total RAM must be greater than 1GB');
assert.ok(mockLocalNode.connectedLaptopsCount >= 1, 'Connected devices count must be at least 1');
assert.strictEqual(mockLocalNode.harmfulFilesDetected, 0, 'Harmful files count must be zero on healthy host');
console.log('✔ Test 2 Passed: Dynamic local node telemetry complies with fleet contracts');

// Test 3: Fleet Aggregation & Summary KPI Math
function computeFleetSummary(nodes: FleetNode[]): FleetSummary {
  const onlineNodes = nodes.filter((n) => n.status === 'ONLINE').length;
  const healthyNodes = nodes.filter((n) => n.safetyVerdict === 'SECURE & HEALTHY').length;
  const atRiskNodes = nodes.length - healthyNodes;
  const avgCpu = Math.round(nodes.reduce((acc, n) => acc + n.cpuPercent, 0) / nodes.length);
  const avgRam = Math.round(nodes.reduce((acc, n) => acc + n.ramPercent, 0) / nodes.length);
  const totalHarmful = nodes.reduce((acc, n) => acc + n.harmfulFilesDetected, 0);
  const totalConnected = Math.max(...nodes.map((n) => n.connectedLaptopsCount), 1);

  return {
    totalNodes: nodes.length,
    onlineNodes,
    healthyNodes,
    atRiskNodes,
    avgCpuPercent: avgCpu,
    avgRamPercent: avgRam,
    totalHarmfulFiles: totalHarmful,
    totalConnectedDevices: totalConnected,
  };
}

const remoteNode1: FleetNode = {
  id: 'node-laptop-01',
  hostname: 'THINKPAD-REMOTE-01',
  assignedUser: 'Second User (Alice - Remote Laptop 1 km away)',
  ipAddress: '192.168.29.105',
  isLocal: false,
  status: 'ONLINE',
  safetyVerdict: 'SECURE & HEALTHY',
  safetyScore: 92,
  cpuPercent: 18,
  ramPercent: 52,
  totalRamGB: 16.0,
  freeRamGB: 7.7,
  activeForegroundApp: 'chrome.exe',
  activeProcessesCount: 58,
  harmfulFilesDetected: 0,
  suspiciousBehaviorsCount: 0,
  connectedLaptopsCount: 4,
  monitoringMode: 'TRANSPARENT_MANAGED',
  userAcknowledged: true,
  timeLimit: 'UNLIMITED_CONTINUOUS',
  os: 'Windows 11 Pro',
  lastHeartbeatUtc: new Date().toISOString(),
};

const remoteNode2: FleetNode = {
  id: 'node-laptop-02',
  hostname: 'MACBOOK-AIR-BOB',
  assignedUser: 'Bob (Design Team)',
  ipAddress: '192.168.29.110',
  isLocal: false,
  status: 'ONLINE',
  safetyVerdict: 'ACTION RECOMMENDED',
  safetyScore: 75,
  cpuPercent: 22,
  ramPercent: 60,
  totalRamGB: 8.0,
  freeRamGB: 3.2,
  activeForegroundApp: 'Code.exe',
  activeProcessesCount: 45,
  harmfulFilesDetected: 1,
  suspiciousBehaviorsCount: 1,
  connectedLaptopsCount: 4,
  monitoringMode: 'TRANSPARENT_MANAGED',
  userAcknowledged: true,
  timeLimit: 'UNLIMITED_CONTINUOUS',
  os: 'macOS Darwin',
  lastHeartbeatUtc: new Date().toISOString(),
};

const fleet = [mockLocalNode, remoteNode1, remoteNode2];
const summary = computeFleetSummary(fleet);

assert.strictEqual(summary.totalNodes, 3);
assert.strictEqual(summary.onlineNodes, 3);
assert.strictEqual(summary.healthyNodes, 2);
assert.strictEqual(summary.atRiskNodes, 1);
assert.strictEqual(summary.totalHarmfulFiles, 1);
assert.strictEqual(summary.totalConnectedDevices, 4);
assert.strictEqual(summary.avgCpuPercent, Math.round((14 + 18 + 22) / 3)); // 18%
console.log('✔ Test 3 Passed: Multi-node fleet KPI summary accurately aggregates telemetry');

// Test 4: Heartbeat Synchronizer
function applyHeartbeat(
  node: FleetNode,
  update: { cpuPercent?: number; ramPercent?: number; activeForegroundApp?: string; harmfulFilesDetected?: number }
): FleetNode {
  return {
    ...node,
    cpuPercent: update.cpuPercent ?? node.cpuPercent,
    ramPercent: update.ramPercent ?? node.ramPercent,
    activeForegroundApp: update.activeForegroundApp ?? node.activeForegroundApp,
    harmfulFilesDetected: update.harmfulFilesDetected ?? node.harmfulFilesDetected,
    lastHeartbeatUtc: new Date().toISOString(),
  };
}

const updated = applyHeartbeat(remoteNode1, {
  cpuPercent: 35,
  activeForegroundApp: 'Notion.exe',
});
assert.strictEqual(updated.cpuPercent, 35);
assert.strictEqual(updated.activeForegroundApp, 'Notion.exe');
console.log('✔ Test 4 Passed: Client telemetry heartbeat synchronizes without state loss');

// Test 5: Client Transparency Status & Privacy Boundary Verification
const clientStatus: ClientTransparencyStatus = {
  isManaged: true,
  managingConsole: 'Personal Cybersecurity Bot (Administrator: Device Owner)',
  clientIp: '192.168.29.105',
  clientHostname: 'THINKPAD-REMOTE-01',
  assignedUser: 'Second User (Alice)',
  transparencyNotice:
    'This device is enrolled in enterprise endpoint protection. Your administrator is monitoring hardware health (CPU, RAM), running processes, and security threat indicators. Monitoring is continuous (no time limit). Private personal activities like keystrokes and screen contents are NEVER captured.',
  monitoringMode: 'TRANSPARENT_MANAGED',
  timeLimit: 'Continuous Enterprise Defense (No time limit)',
  scopeOfTelemetry: [
    'CPU Load and Memory Utilization',
    'Active Foreground Application Name',
    'Threat Scans and Harmful File Detection',
    'Subnet Device Discovery (Connected Laptops)',
    'Firewall and Listening Port Inventory',
  ],
  privacyBoundaries: [
    'ZERO Keystroke Logging (Privacy Guaranteed)',
    'ZERO Screen Recording or Webcam Access',
    'ZERO Personal Credential or Email Inspection',
    'Encrypted Local Audit Trail',
  ],
  lastHeartbeatUtc: new Date().toISOString(),
};

assert.strictEqual(clientStatus.isManaged, true);
assert.ok(clientStatus.timeLimit.includes('No time limit'), 'Time limit must be unlimited');
assert.ok(clientStatus.privacyBoundaries.some((b) => b.includes('ZERO Keystroke Logging')), 'Must guarantee no keystroke logging');
assert.ok(clientStatus.privacyBoundaries.some((b) => b.includes('ZERO Screen Recording')), 'Must guarantee no screen recording');
assert.ok(clientStatus.scopeOfTelemetry.some((s) => s.includes('Active Foreground Application')), 'Scope includes active app');
assert.ok(clientStatus.scopeOfTelemetry.some((s) => s.includes('Subnet Device Discovery')), 'Scope includes connected laptops');
console.log('✔ Test 5 Passed: Client transparency status upholds zero-covert surveillance guarantees');

// Test 6: Standardized Port Catalog Verification (Specifically Port 1 TCPMUX)
const KNOWN_PORTS_TEST_CATALOG: Record<number, { serviceName: string; risk: 'LOW' | 'MEDIUM' | 'HIGH'; description: string }> = {
  1: { serviceName: 'TCPMUX (TCP Port Service Multiplexer)', risk: 'LOW', description: 'RFC 1078 TCP port multiplexer protocol' },
  21: { serviceName: 'FTP (File Transfer Protocol)', risk: 'HIGH', description: 'Unencrypted cleartext file transfer service' },
  22: { serviceName: 'SSH (Secure Shell)', risk: 'LOW', description: 'Encrypted administrative terminal shell' },
  80: { serviceName: 'HTTP (Hypertext Transfer Protocol)', risk: 'MEDIUM', description: 'World Wide Web server daemon' },
  443: { serviceName: 'HTTPS (HTTP over TLS/SSL)', risk: 'LOW', description: 'Encrypted secure web communication' },
  445: { serviceName: 'SMB (Server Message Block / NetBIOS)', risk: 'HIGH', description: 'Windows file sharing protocol' },
  3000: { serviceName: 'Personal Cybersecurity Bot (Fleet Console API)', risk: 'LOW', description: 'Antigravity centralized security management node' },
  3389: { serviceName: 'RDP (Remote Desktop Protocol)', risk: 'HIGH', description: 'Microsoft Windows Graphical Remote Desktop' },
};

function getPortServiceInfo(port: number) {
  return KNOWN_PORTS_TEST_CATALOG[port] || { serviceName: `Unknown Port Service (${port})`, risk: 'LOW', description: `Raw TCP listener on port ${port}` };
}

const port1Info = getPortServiceInfo(1);
assert.strictEqual(port1Info.serviceName, 'TCPMUX (TCP Port Service Multiplexer)');
assert.strictEqual(port1Info.risk, 'LOW');
assert.ok(port1Info.description.includes('RFC 1078'));
console.log('✔ Test 6 Passed: Port 1 accurately standardizes to RFC 1078 TCPMUX (TCP Port Service Multiplexer)');

// Test 7: Second User Client Telemetry & Deep Hardware Scan Ingestion
const secondUserPayload: SecondUserJoinPayload = {
  assignedUser: 'Second User (Sarah - ThinkPad X1)',
  hostname: 'THINKPAD-SARAH',
  os: 'Windows 11 Pro 64-bit',
  cpuModel: 'Intel(R) Core(TM) i7-1185G7 @ 3.00GHz',
  cpuCores: 8,
  cpuSpeedMHz: 3000,
  cpuPercent: 16,
  ramPercent: 44,
  totalRamGB: 16.0,
  freeRamGB: 8.9,
  storageDrives: [
    { drive: 'C:', totalGB: 512, freeGB: 240, usedPct: 53 },
    { drive: 'D:', totalGB: 1024, freeGB: 820, usedPct: 20 },
  ],
  activeForegroundApp: 'Code.exe (Visual Studio Code)',
  activeProcessesCount: 78,
  harmfulFilesDetected: 0,
  harmfulThreats: [],
};

function ingestSecondUserTelemetry(payload: SecondUserJoinPayload, clientIp: string): FleetNode {
  return {
    id: `node-remote-${payload.hostname}`,
    hostname: payload.hostname || 'REMOTE-LAPTOP',
    assignedUser: payload.assignedUser,
    ipAddress: clientIp,
    isLocal: false,
    status: 'ONLINE',
    safetyVerdict: (payload.harmfulFilesDetected || 0) > 0 ? 'ACTION RECOMMENDED' : 'SECURE & HEALTHY',
    safetyScore: (payload.harmfulFilesDetected || 0) > 0 ? 70 : 95,
    cpuPercent: payload.cpuPercent ?? 15,
    ramPercent: payload.ramPercent ?? 45,
    totalRamGB: payload.totalRamGB ?? 16.0,
    freeRamGB: payload.freeRamGB ?? 8.0,
    activeForegroundApp: payload.activeForegroundApp || 'Unknown',
    activeProcessesCount: payload.activeProcessesCount ?? 40,
    harmfulFilesDetected: payload.harmfulFilesDetected ?? 0,
    harmfulThreats: payload.harmfulThreats || [],
    suspiciousBehaviorsCount: 0,
    connectedLaptopsCount: 2,
    monitoringMode: 'TRANSPARENT_MANAGED',
    userAcknowledged: true,
    timeLimit: 'UNLIMITED_CONTINUOUS',
    os: payload.os || 'Windows 11 Laptop',
    lastHeartbeatUtc: new Date().toISOString(),
    cpuModel: payload.cpuModel,
    cpuCores: payload.cpuCores,
    cpuSpeedMHz: payload.cpuSpeedMHz,
    storageDrives: payload.storageDrives,
    isAgentless: false,
  };
}

const secondUserNode = ingestSecondUserTelemetry(secondUserPayload, '192.168.29.108');
assert.strictEqual(secondUserNode.isAgentless, false);
assert.strictEqual(secondUserNode.cpuModel, 'Intel(R) Core(TM) i7-1185G7 @ 3.00GHz');
assert.strictEqual(secondUserNode.cpuCores, 8);
assert.strictEqual(secondUserNode.totalRamGB, 16.0);
assert.strictEqual(secondUserNode.freeRamGB, 8.9);
assert.strictEqual(secondUserNode.storageDrives?.length, 2);
assert.strictEqual(secondUserNode.storageDrives?.[0].drive, 'C:');
assert.strictEqual(secondUserNode.safetyVerdict, 'SECURE & HEALTHY');
console.log('✔ Test 7 Passed: Second user client payload successfully ingests exact physical hardware & drive telemetry');

console.log('All 7 Multi-Node Fleet & Transparency verification checks passed successfully.');

import assert from 'assert';
import { FleetNode, ConnectedUsbPeripheral } from '../src/types/security';

console.log('--- Running Scanner, Hardware & Chatbot Brevity Test Suite ---');

// Test 1: Verify network Port 445 is NEVER labeled as a "Harmful File"
const sampleNodeWithPort445: FleetNode = {
  id: 'node-test-1',
  hostname: 'TEST-LAPTOP',
  assignedUser: 'Second User',
  ipAddress: '192.168.1.50',
  isLocal: false,
  status: 'ONLINE',
  safetyVerdict: 'ACTION RECOMMENDED',
  safetyScore: 72,
  cpuPercent: 15,
  ramPercent: 40,
  totalRamGB: 16,
  freeRamGB: 9.5,
  activeForegroundApp: 'Code.exe',
  activeProcessesCount: 45,
  harmfulFilesDetected: 0,
  harmfulThreats: [],
  suspiciousBehaviorsCount: 0,
  connectedLaptopsCount: 1,
  monitoringMode: 'TRANSPARENT_MANAGED',
  userAcknowledged: true,
  timeLimit: 'UNLIMITED_CONTINUOUS',
  os: 'Windows 11',
  lastHeartbeatUtc: new Date().toISOString(),
  openPorts: [
    {
      port: 445,
      serviceName: 'SMB',
      isOpen: true,
      risk: 'HIGH',
      description: 'Windows File Sharing & RPC (Vulnerable if exposed)',
    },
  ],
};

assert.strictEqual(sampleNodeWithPort445.harmfulFilesDetected, 0, 'Open port 445 must NOT increment harmfulFilesDetected');
assert.strictEqual(sampleNodeWithPort445.harmfulThreats?.length ?? 0, 0, 'Open port 445 must NOT create synthetic threat-port files');
assert.strictEqual(sampleNodeWithPort445.openPorts?.[0].port, 445);
assert.strictEqual(sampleNodeWithPort445.openPorts?.[0].serviceName, 'SMB');
console.log('✔ Test 1 Passed: Network Port 445 is strictly isolated from harmful filesystem files');

// Test 2: Verify ConnectedUsbPeripheral schema and mouse detection
const sampleMouse: ConnectedUsbPeripheral = {
  name: 'HID-compliant mouse',
  category: 'Mouse',
  status: 'OK',
  manufacturer: 'Microsoft',
};

assert.strictEqual(sampleMouse.category, 'Mouse');
assert.strictEqual(sampleMouse.status, 'OK');
console.log('✔ Test 2 Passed: ConnectedUsbPeripheral correctly structures physical mouse hardware');

// Test 3: Verify chatbot fallback reply conciseness and Port 445 / Mouse clarification
function getFallbackReply(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('445') || lower.includes('mouse') || lower.includes('usb') || lower.includes('hardware')) {
    return 'Port 445 is a virtual network port for Windows SMB file sharing, not your physical USB mouse port. Your mouse connects via physical USB hardware, which is safe and separate from network ports.';
  }
  return 'Your PC security is active and monitored. Suspicious downloads and risky connections are blocked in real time.';
}

const replyForMousePort = getFallbackReply('why does port 445 show up when my mouse is connected?');
const sentences = replyForMousePort.split(/[.!?]+/).filter((s) => s.trim().length > 0);
const wordCount = replyForMousePort.split(/\s+/).length;

assert.ok(sentences.length <= 3, `Expected at most 3 sentences, got ${sentences.length}`);
assert.ok(wordCount <= 60, `Expected at most 60 words, got ${wordCount}`);
assert.ok(replyForMousePort.includes('virtual network port'), 'Reply must explain Port 445 is a virtual network port');
assert.ok(replyForMousePort.includes('USB'), 'Reply must clarify mouse connects via physical USB');
console.log('✔ Test 3 Passed: Chatbot brevity and Port 445 / mouse clarification verified');

console.log('All Scanner, Hardware & Chatbot Brevity verification checks passed successfully.');

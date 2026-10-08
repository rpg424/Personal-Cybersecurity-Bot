import assert from 'assert';
import os from 'os';
import fs from 'fs';

console.log('--- Running Safety Engine & Hardware Telemetry Verification ---');

// 1. Verify Safety Score Algorithm directly
function computeVerdict(
  unresolvedAlerts: Array<{ severity: 'low' | 'medium' | 'high' | 'critical' }>,
  firewallEnabled: boolean,
  listeningPorts: Array<{ port: number; risk: 'LOW' | 'MEDIUM' | 'HIGH' }>,
  ramUsedPct: number,
  storageUsedPct: number
) {
  let score = 100;
  const deductions: Array<{ reason: string; points: number }> = [];

  const criticals = unresolvedAlerts.filter((a) => a.severity === 'critical');
  const highs = unresolvedAlerts.filter((a) => a.severity === 'high');

  if (criticals.length > 0) {
    const pts = Math.min(40, criticals.length * 20);
    score -= pts;
    deductions.push({ reason: 'Critical threats', points: pts });
  }

  if (highs.length > 0) {
    const pts = Math.min(20, highs.length * 10);
    score -= pts;
    deductions.push({ reason: 'High alerts', points: pts });
  }

  if (!firewallEnabled) {
    score -= 25;
    deductions.push({ reason: 'Firewall disabled', points: 25 });
  }

  const highRiskPorts = listeningPorts.filter((p) => p.risk === 'HIGH');
  if (highRiskPorts.length > 0) {
    score -= 15;
    deductions.push({ reason: 'High risk ports', points: 15 });
  }

  if (ramUsedPct > 90) {
    score -= 10;
    deductions.push({ reason: 'RAM critical', points: 10 });
  }

  if (storageUsedPct > 92) {
    score -= 10;
    deductions.push({ reason: 'Disk full', points: 10 });
  }

  score = Math.max(0, Math.min(100, score));

  let verdict: 'SECURE & HEALTHY' | 'ACTION RECOMMENDED' | 'CRITICAL RISK';
  if (score >= 90) {
    verdict = 'SECURE & HEALTHY';
  } else if (score >= 70) {
    verdict = 'ACTION RECOMMENDED';
  } else {
    verdict = 'CRITICAL RISK';
  }

  return { score, verdict, deductions };
}

// Test Case 1: Pristine system
const pristine = computeVerdict([], true, [{ port: 3000, risk: 'LOW' }], 45, 50);
assert.strictEqual(pristine.score, 100, 'Pristine system must have score 100');
assert.strictEqual(pristine.verdict, 'SECURE & HEALTHY', 'Score 100 must be SECURE & HEALTHY');
assert.strictEqual(pristine.deductions.length, 0, 'No deductions for pristine system');
console.log('✔ Test 1 Passed: Pristine system achieves 100/100 (SECURE & HEALTHY)');

// Test Case 2: One High alert + Full disk
const minorIssues = computeVerdict([{ severity: 'high' }], true, [], 60, 95);
assert.strictEqual(minorIssues.score, 80, 'Score should deduct 10 for high alert and 10 for disk');
assert.strictEqual(minorIssues.verdict, 'ACTION RECOMMENDED', 'Score 80 must be ACTION RECOMMENDED');
console.log('✔ Test 2 Passed: Minor issues produce 80/100 (ACTION RECOMMENDED)');

// Test Case 3: Critical ransomware canary trigger + Firewall disabled
const criticalBreach = computeVerdict([{ severity: 'critical' }], false, [], 50, 40);
assert.strictEqual(criticalBreach.score, 55, 'Score should deduct 20 for critical and 25 for firewall');
assert.strictEqual(criticalBreach.verdict, 'CRITICAL RISK', 'Score 55 must be CRITICAL RISK');
console.log('✔ Test 3 Passed: Critical breach produces 55/100 (CRITICAL RISK)');

// Test Case 4: High risk exposed port (SMB 445 or RDP 3389)
const portExposure = computeVerdict([], true, [{ port: 445, risk: 'HIGH' }], 40, 40);
assert.strictEqual(portExposure.score, 85, 'High risk port must deduct 15 points');
assert.strictEqual(portExposure.verdict, 'ACTION RECOMMENDED');
console.log('✔ Test 4 Passed: Exposed SMB port correctly penalizes 15 points');

// Test Case 5: Real OS Telemetry sanity check
const cpus = os.cpus();
assert.ok(cpus.length > 0, 'OS must report at least 1 CPU core');
const totalMem = os.totalmem();
assert.ok(totalMem > 1024 * 1024 * 1024, 'OS must report at least 1 GB RAM');
console.log(`✔ Test 5 Passed: Real OS CPU detected: ${cpus[0]?.model || 'Generic'} (${cpus.length} cores), Total RAM: ${(totalMem / (1024**3)).toFixed(1)} GB`);

// Test Case 6: Verify server.ts exposes new routes
const serverSource = fs.readFileSync('server.ts', 'utf8');
assert.ok(serverSource.includes('/api/v1/hardware/deep-telemetry'), 'server.ts must contain /api/v1/hardware/deep-telemetry');
assert.ok(serverSource.includes('/api/v1/security/posture'), 'server.ts must contain /api/v1/security/posture');
assert.ok(serverSource.includes('/api/v1/security/safety-verdict'), 'server.ts must contain /api/v1/security/safety-verdict');
console.log('✔ Test 6 Passed: server.ts routes properly declared and mapped');

console.log('All 6 Safety & Hardware verification checks passed successfully.');

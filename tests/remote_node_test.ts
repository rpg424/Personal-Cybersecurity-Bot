import assert from 'assert';
import net from 'net';

console.log('--- Running Remote IP Node & Prober Verification Suite ---');

// 1. Hostname/IP Validation Function Test
function validateTargetHost(host: unknown): boolean {
  if (!host || typeof host !== 'string') return false;
  const trimmed = host.trim();
  if (trimmed.length === 0 || trimmed.length > 255) return false;
  // Match IPv4, IPv6, standard hostname/FQDN, reject dangerous shell metacharacters
  return /^([a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])$/.test(trimmed);
}

// Valid hosts
assert.ok(validateTargetHost('127.0.0.1'), '127.0.0.1 must be valid');
assert.ok(validateTargetHost('192.168.1.1'), '192.168.1.1 must be valid');
assert.ok(validateTargetHost('10.0.0.15'), '10.0.0.15 must be valid');
assert.ok(validateTargetHost('localhost'), 'localhost must be valid');
assert.ok(validateTargetHost('my-laptop.local'), 'my-laptop.local must be valid');
assert.ok(validateTargetHost('[::1]'), '[::1] IPv6 must be valid');
console.log('✔ Test 1 Passed: Valid IPv4, IPv6, and LAN hostnames accepted');

// Malformed / Injection attempts
assert.strictEqual(validateTargetHost('127.0.0.1; whoami'), false, 'Command injection must be rejected');
assert.strictEqual(validateTargetHost('192.168.1.1 & calc'), false, 'Shell ampersand must be rejected');
assert.strictEqual(validateTargetHost('10.0.0.1 | rm -rf'), false, 'Pipe must be rejected');
assert.strictEqual(validateTargetHost('10.0.0.1\ncat /etc/passwd'), false, 'Newline must be rejected');
assert.strictEqual(validateTargetHost(''), false, 'Empty host must be rejected');
assert.strictEqual(validateTargetHost(null), false, 'Null host must be rejected');
console.log('✔ Test 2 Passed: Injection payloads strictly rejected');

// 2. OS Fingerprinting Logic Test
function fingerprintOS(openPortList: number[], reachable: boolean): string {
  const ports = new Set(openPortList);
  if (ports.has(445) || ports.has(3389) || ports.has(5985) || ports.has(5986)) {
    return 'Windows PC / Windows Server';
  } else if (ports.has(22)) {
    return 'Linux / Unix / macOS Node';
  } else if (ports.has(80) || ports.has(443) || ports.has(8080)) {
    return 'Embedded Web / Gateway Node';
  } else if (reachable) {
    return 'Active Network System (Custom Services)';
  } else {
    return 'Unreachable or Fully Stealth Host (ICMP/TCP Drop)';
  }
}

assert.strictEqual(fingerprintOS([445, 135], true), 'Windows PC / Windows Server');
assert.strictEqual(fingerprintOS([3389], true), 'Windows PC / Windows Server');
assert.strictEqual(fingerprintOS([22], true), 'Linux / Unix / macOS Node');
assert.strictEqual(fingerprintOS([80, 443], true), 'Embedded Web / Gateway Node');
assert.strictEqual(fingerprintOS([9000], true), 'Active Network System (Custom Services)');
assert.strictEqual(fingerprintOS([], false), 'Unreachable or Fully Stealth Host (ICMP/TCP Drop)');
console.log('✔ Test 3 Passed: OS Fingerprinting correctly identifies Windows, Linux, and Web nodes');

// 3. Remote Safety Score Calculation Test
function calculateRemoteSafety(openPortList: number[], reachable: boolean): { score: number; verdict: string } {
  if (!reachable) return { score: 0, verdict: 'CRITICAL RISK' };

  let score = 100;
  const ports = new Set(openPortList);
  if (ports.has(445)) score -= 20;
  if (ports.has(3389)) score -= 15;
  if (ports.has(80) && !ports.has(443)) score -= 10;

  score = Math.max(0, Math.min(100, score));
  let verdict = 'SECURE & HEALTHY';
  if (score < 65) verdict = 'CRITICAL RISK';
  else if (score < 85) verdict = 'ACTION RECOMMENDED';

  return { score, verdict };
}

const secureNode = calculateRemoteSafety([22, 443], true);
assert.strictEqual(secureNode.score, 100);
assert.strictEqual(secureNode.verdict, 'SECURE & HEALTHY');

const exposedWindows = calculateRemoteSafety([445, 3389], true);
assert.strictEqual(exposedWindows.score, 65);
assert.strictEqual(exposedWindows.verdict, 'ACTION RECOMMENDED');

const unreachableNode = calculateRemoteSafety([], false);
assert.strictEqual(unreachableNode.score, 0);
assert.strictEqual(unreachableNode.verdict, 'CRITICAL RISK');
console.log('✔ Test 4 Passed: Remote safety scores and thresholds verified');

// 4. Live TCP Loopback Socket Test
async function testLoopbackSocket() {
  const server = net.createServer();
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as net.AddressInfo;
  const assignedPort = address.port;

  // Probe using net.Socket
  const startTime = Date.now();
  const probeSuccess = await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(assignedPort, '127.0.0.1');
  });

  const latency = Date.now() - startTime;
  server.close();

  assert.strictEqual(probeSuccess, true, 'TCP socket probe on loopback must succeed');
  assert.ok(latency < 500, `Latency (${latency}ms) must be under 500ms`);
  console.log(`✔ Test 5 Passed: Live TCP loopback probe succeeded in ${latency}ms`);
}

testLoopbackSocket().then(() => {
  console.log('All 5 Remote IP Node Prober verification checks passed successfully.');
});

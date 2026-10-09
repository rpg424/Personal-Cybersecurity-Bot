import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('--- Running Multi-Node Fleet & Remote Laptop Deep Cockpit Test Suite ---');

  // Discover active token from local supervisor
  const enrollRes = await fetch(`${BASE_URL}/api/v1/enrollment`);
  const enrollData = await enrollRes.json();
  const token = enrollData.active_token || enrollData.ipc_token;
  assert.ok(token, 'Must acquire IPC bearer token');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Check auth session
  const sessionRes = await fetch(`${BASE_URL}/api/v1/auth/session`, { headers });
  const sessionData = await sessionRes.json();
  if (sessionData.is_locked) {
    console.log('[Auth] Console is locked. Unlocking for automated test execution...');
    // Attempt unlock with 1234 or reset
    const unlockRes = await fetch(`${BASE_URL}/api/v1/auth/unlock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pin: '1234' }),
    });
    if (!unlockRes.ok) {
      // Re-setup if necessary
      await fetch(`${BASE_URL}/api/v1/auth/setup`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pin: '1234', userName: 'FleetTester' }),
      });
    }
  }

  // 1. Fetch Fleet Nodes and verify Hardware Telemetry
  console.log('\n[1/5] Verifying Physical Hardware Details & Active App Telemetry...');
  const nodesRes = await fetch(`${BASE_URL}/api/v1/fleet/nodes`, { headers });
  assert.strictEqual(nodesRes.status, 200, 'Fleet nodes endpoint must return 200');
  const nodesData = await nodesRes.json();
  assert.ok(nodesData.nodes && nodesData.nodes.length > 0, 'Fleet should have at least 1 node (local host)');

  const localNode = nodesData.nodes.find((n: any) => n.id === 'node-local' || n.isLocal);
  assert.ok(localNode, 'Local primary node must exist');
  assert.ok(typeof localNode.cpuModel === 'string' && localNode.cpuModel.length > 0, 'cpuModel must be a non-empty string');
  assert.ok(typeof localNode.cpuCores === 'number' && localNode.cpuCores > 0, 'cpuCores must be greater than 0');
  assert.ok(typeof localNode.activeForegroundApp === 'string', 'activeForegroundApp must be present');
  assert.ok(Array.isArray(localNode.storageDrives), 'storageDrives must be an array');
  console.log(`✔ Verified Hardware: CPU="${localNode.cpuModel}" (${localNode.cpuCores} cores), ActiveApp="${localNode.activeForegroundApp}", Drives=${localNode.storageDrives?.length}`);

  // 2. On-demand File Scan Endpoint
  console.log('\n[2/5] Testing On-demand File Scan (POST /api/v1/fleet/nodes/:id/scan-files)...');
  const scanRes = await fetch(`${BASE_URL}/api/v1/fleet/nodes/node-local/scan-files`, {
    method: 'POST',
    headers,
  });
  assert.strictEqual(scanRes.status, 200, 'Scan endpoint must return 200');
  const scanData = await scanRes.json();
  assert.strictEqual(scanData.success, true, 'Scan must succeed');
  assert.ok(typeof scanData.scannedFilesCount === 'number', 'scannedFilesCount must be a number');
  assert.ok(Array.isArray(scanData.threatsFound), 'threatsFound must be an array');
  console.log(`✔ Verified File Scan: Scanned ${scanData.scannedFilesCount} items, Found ${scanData.threatsFound.length} threats`);

  // 3. Domain Blocking & Unblocking API
  console.log('\n[3/5] Testing Harmful Website / Domain Blocking & Unblocking...');
  const testDomain = 'phishing-test-cockpit.xyz';

  // Block domain
  const blockDomRes = await fetch(`${BASE_URL}/api/v1/fleet/nodes/node-local/block-domain`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ domain: testDomain, reason: 'Phishing credential theft' }),
  });
  assert.strictEqual(blockDomRes.status, 200, 'Block domain endpoint must return 200');
  const blockDomData = await blockDomRes.json();
  assert.strictEqual(blockDomData.success, true, 'Block domain must succeed');
  assert.ok(blockDomData.blockedDomains.includes(testDomain), 'Blocked list must contain the test domain');
  console.log(`✔ Successfully blocked domain: ${testDomain}`);

  // Unblock domain
  const unblockDomRes = await fetch(`${BASE_URL}/api/v1/fleet/nodes/node-local/unblock-domain`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ domain: testDomain }),
  });
  assert.strictEqual(unblockDomRes.status, 200, 'Unblock domain endpoint must return 200');
  const unblockDomData = await unblockDomRes.json();
  assert.strictEqual(unblockDomData.success, true, 'Unblock domain must succeed');
  assert.ok(!unblockDomData.blockedDomains.includes(testDomain), 'Blocked list must no longer contain the test domain');
  console.log(`✔ Successfully unblocked domain: ${testDomain}`);

  // 4. Harmful File Blocking & Blacklisting API
  console.log('\n[4/5] Testing Harmful File Blocking & Blacklisting...');
  const testFilePath = 'C:\\Users\\MockUser\\Downloads\\ransomware_sample.exe';
  const blockFileRes = await fetch(`${BASE_URL}/api/v1/fleet/nodes/node-local/block-file`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ filePath: testFilePath, reason: 'Trojan downloader heuristic' }),
  });
  assert.strictEqual(blockFileRes.status, 200, 'Block file endpoint must return 200');
  const blockFileData = await blockFileRes.json();
  assert.strictEqual(blockFileData.success, true, 'Block file must succeed');
  assert.ok(blockFileData.blockedFiles.includes(testFilePath), 'Blocked files must contain test file');
  console.log(`✔ Successfully blocked harmful file: ${testFilePath}`);

  // 5. Remote Endpoint Join with Harmful Website Telemetry Detection
  console.log('\n[5/5] Testing Remote Endpoint Join & Harmful URL Safety Analysis...');
  const joinPayload = {
    assignedUser: 'Remote Tester Laptop',
    hostname: 'TEST-LAPTOP-ROAMING',
    os: 'Windows 11',
    cpuModel: 'Intel Core i7-13700H',
    cpuCores: 14,
    cpuSpeedMHz: 2600,
    cpuPercent: 18,
    ramPercent: 42,
    totalRamGB: 32,
    freeRamGB: 18.5,
    storageDrives: [{ drive: 'C:', totalGB: 1024, freeGB: 600, usedPct: 41 }],
    activeForegroundApp: 'Google Chrome',
    activeProcessesCount: 68,
    activeBrowserUrl: 'https://paypal-verify-account.cc/login',
    activeBrowserDomain: 'paypal-verify-account.cc',
    harmfulFilesDetected: 1,
    harmfulThreats: [
      {
        fileName: 'stealer.bat',
        filePath: 'C:\\Users\\Downloads\\stealer.bat',
        riskAnalysis: 'High risk credential harvester',
        recommendation: 'Block and isolate file immediately',
        status: 'unresolved' as const,
      },
    ],
  };

  const joinRes = await fetch(`${BASE_URL}/api/v1/fleet/join-endpoint`, {
    method: 'POST',
    headers,
    body: JSON.stringify(joinPayload),
  });
  assert.strictEqual(joinRes.status, 200, 'Join endpoint must return 200');
  const joinData = await joinRes.json();
  assert.strictEqual(joinData.success, true, 'Join must succeed');
  assert.ok(joinData.node, 'Joined node must be returned');

  // Verify that the backend flagged the deceptive phishing URL as HARMFUL_BLOCKED
  assert.strictEqual(
    joinData.node.activeBrowserVerdict,
    'HARMFUL_BLOCKED',
    'URL with "paypal-verify" on .cc TLD must be flagged as HARMFUL_BLOCKED'
  );
  assert.ok(
    joinData.node.activeBrowserRiskScore >= 90,
    `Risk score should be >= 90, got ${joinData.node.activeBrowserRiskScore}`
  );
  assert.strictEqual(
    joinData.node.activeBrowserCategory,
    'Phishing / Credential Harvesting',
    'Category should be Phishing'
  );
  console.log(`✔ Verified Remote Phishing URL Safety Analysis: Domain="${joinData.node.activeBrowserDomain}" -> Verdict=${joinData.node.activeBrowserVerdict} (Score: ${joinData.node.activeBrowserRiskScore}/100, Cat: ${joinData.node.activeBrowserCategory})`);

  // Test suspicious TLD domain
  const suspRes = await fetch(`${BASE_URL}/api/v1/fleet/join-endpoint`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      assignedUser: 'Remote Tester Laptop',
      hostname: 'TEST-LAPTOP-ROAMING',
      activeBrowserUrl: 'https://cdn-download-mirror.xyz',
      activeBrowserDomain: 'cdn-download-mirror.xyz',
    }),
  });
  const suspData = await suspRes.json();
  assert.strictEqual(suspData.node.activeBrowserVerdict, 'SUSPICIOUS', '.xyz TLD must be flagged SUSPICIOUS');
  console.log(`✔ Verified Remote Suspicious TLD Analysis: Domain="${suspData.node.activeBrowserDomain}" -> Verdict=${suspData.node.activeBrowserVerdict} (Score: ${suspData.node.activeBrowserRiskScore}/100)`);

  // Test safe domain
  const safeRes = await fetch(`${BASE_URL}/api/v1/fleet/join-endpoint`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      assignedUser: 'Remote Tester Laptop',
      hostname: 'TEST-LAPTOP-ROAMING',
      activeBrowserUrl: 'https://github.com/login',
      activeBrowserDomain: 'github.com',
    }),
  });
  const safeData = await safeRes.json();
  assert.strictEqual(safeData.node.activeBrowserVerdict, 'SAFE', 'github.com must be flagged SAFE');
  console.log(`✔ Verified Remote Safe Domain Analysis: Domain="${safeData.node.activeBrowserDomain}" -> Verdict=${safeData.node.activeBrowserVerdict} (Score: ${safeData.node.activeBrowserRiskScore}/100)`);

  console.log('\n=============================================================');
  console.log('✅ ALL FLEET COCKPIT & REMOTE HARDWARE / WEB PROTECTION TESTS PASSED!');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

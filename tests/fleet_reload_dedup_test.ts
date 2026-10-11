import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:3000';

async function runReloadDedupTest() {
  console.log('--- Running Fleet Client Reload & Deduplication Test ---');

  // Discover active token
  const enrollRes = await fetch(`${BASE_URL}/api/v1/enrollment`);
  const enrollData = await enrollRes.json();
  const token = enrollData.active_token || enrollData.ipc_token;
  assert.ok(token, 'Must acquire IPC token');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const testSessionId = `test-sess-${Date.now()}`;
  const testNodeId = `node-reload-test-${Date.now().toString(36)}`;
  const testHostname = 'WINDOWS-CLIENT-RELOAD-TEST';

  // Step 1: Initial client join
  const join1Res = await fetch(`${BASE_URL}/api/v1/fleet/join-endpoint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-session-id': testSessionId,
    },
    body: JSON.stringify({
      nodeId: testNodeId,
      clientSessionId: testSessionId,
      hostname: testHostname,
      assignedUser: 'Reload Test User',
      os: 'Windows 11',
      cpuPercent: 12,
      ramPercent: 44,
      totalRamGB: 16,
      freeRamGB: 8,
      activeBrowserUrl: 'https://github.com',
      activeBrowserDomain: 'github.com',
    }),
  });
  assert.strictEqual(join1Res.status, 200, 'Initial join must succeed');
  const join1Data = await join1Res.json();
  assert.strictEqual(join1Data.success, true);
  assert.strictEqual(join1Data.node.hostname, testHostname);
  const enrolledId = join1Data.node.id;

  // Step 2: Fetch fleet nodes and count
  const list1Res = await fetch(`${BASE_URL}/api/v1/fleet/nodes`, { headers });
  const list1Data = await list1Res.json();
  const matches1 = list1Data.nodes.filter((n: any) => n.hostname === testHostname);
  assert.strictEqual(matches1.length, 1, 'Should have exactly 1 node matching testHostname');

  // Step 3: Simulate browser reload and subsequent check-in (same nodeId, sessionId, and stable hostname)
  const reloadRes = await fetch(`${BASE_URL}/api/v1/fleet/join-endpoint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-session-id': testSessionId,
    },
    body: JSON.stringify({
      nodeId: enrolledId,
      clientSessionId: testSessionId,
      hostname: testHostname,
      assignedUser: 'Reload Test User',
      os: 'Windows 11',
      cpuPercent: 18,
      ramPercent: 46,
      totalRamGB: 16,
      freeRamGB: 8,
      activeBrowserUrl: 'https://github.com/login',
      activeBrowserDomain: 'github.com',
    }),
  });
  assert.strictEqual(reloadRes.status, 200, 'Reload check-in must succeed');
  const reloadData = await reloadRes.json();
  assert.strictEqual(reloadData.success, true);
  assert.strictEqual(reloadData.node.id, enrolledId, 'Reload check-in must retain the exact same node ID');
  assert.strictEqual(reloadData.node.hostname, testHostname, 'Hostname must not change');

  // Step 4: Verify fleet list has ZERO duplicate nodes created
  const list2Res = await fetch(`${BASE_URL}/api/v1/fleet/nodes`, { headers });
  const list2Data = await list2Res.json();
  const matches2 = list2Data.nodes.filter((n: any) => n.hostname === testHostname);
  assert.strictEqual(matches2.length, 1, 'After reload, fleet must still have exactly 1 node (ZERO duplicates)');
  assert.strictEqual(matches2[0].id, enrolledId, 'Node ID must remain invariant');
  assert.strictEqual(matches2[0].cpuPercent, 18, 'Updated telemetry must be recorded');

  // Clean up: delete test node so it does not pollute storage
  await fetch(`${BASE_URL}/api/v1/fleet/nodes/${enrolledId}`, {
    method: 'DELETE',
    headers,
  });

  console.log('✔ Verified: Reloading browser preserves connection, retains node ID, and creates 0 duplicates.');
}

runReloadDedupTest().catch((err) => {
  console.error('❌ Reload test failed:', err);
  process.exit(1);
});

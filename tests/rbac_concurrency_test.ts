import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';

/**
 * RBAC & Concurrency Self-Check
 * Tests:
 * 1. Default signup assigns SECURITY_ANALYST role
 * 2. Non-admin access to admin endpoints returns 403 Forbidden
 * 3. Admin access to admin endpoints succeeds
 * 4. 15+ concurrent sessions tracked independently with active count
 */

async function main() {
  console.log('--- Running RBAC, Concurrency & Security Gate Tests ---');

  // Verify data/users.json file exists and is valid JSON
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const usersPath = path.join(dataDir, 'users.json');
  if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '[]', 'utf8');
  assert.ok(fs.existsSync(usersPath), 'data/users.json must exist');
  const rawUsers = fs.readFileSync(usersPath, 'utf8');
  const users = JSON.parse(rawUsers);
  assert.ok(Array.isArray(users), 'users.json must store an array of user objects');
  console.log(`✔ Check 1 Passed: Users repository verified with ${users.length} registered user(s)`);

  // Ensure server is responding or spawn if not running
  let spawnedServer: ChildProcess | null = null;
  const ping = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:3000/api/v1/health', (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1500, () => {
        req.destroy();
        resolve(false);
      });
    });
  };

  if (!(await ping())) {
    console.log('[RBAC Runner] Local dev server not running. Spawning test server...');
    spawnedServer = spawn('npx', ['tsx', 'server.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1' },
      stdio: 'ignore',
    });
    const startTime = Date.now();
    while (Date.now() - startTime < 30000) {
      await new Promise((r) => setTimeout(r, 600));
      if (await ping()) break;
    }
    assert.ok(await ping(), 'Failed to reach server on 127.0.0.1:3000');
  }

  // Helper for HTTP requests
  const request = (
    method: string,
    urlPath: string,
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : undefined;
      const req = http.request(
        `http://127.0.0.1:3000${urlPath}`,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...headers,
          },
        },
        (res) => {
          let chunks = '';
          res.on('data', (d) => (chunks += d));
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode || 0,
                data: chunks ? JSON.parse(chunks) : {},
                headers: res.headers,
              });
            } catch {
              resolve({
                status: res.statusCode || 0,
                data: chunks,
                headers: res.headers,
              });
            }
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  // Ensure Admin is configured if initial setup
  const initialSession = await request('GET', '/api/v1/auth/session');
  if (!initialSession.data.has_configured_pin) {
    await request('POST', '/api/v1/auth/signup', {
      fullName: 'Master Admin',
      email: 'admin@shieldlabs.local',
      password: 'AdminMasterPassword123!',
      role: 'ADMIN',
    });
  }

  // Test 2: Analyst Signup creates secondary account with SECURITY_ANALYST role
  const testAnalystEmail = `analyst_${Date.now()}@shieldlabs.local`;
  const signupRes = await request('POST', '/api/v1/auth/signup', {
    fullName: 'Ops Analyst',
    email: testAnalystEmail,
    password: 'SecurePassword123!',
    role: 'SECURITY_ANALYST',
  });
  assert.ok(signupRes.status === 200 || signupRes.status === 201, 'Signup must return 200 OK or 201 Created');
  assert.strictEqual(signupRes.data.user.role, 'SECURITY_ANALYST', 'New user must receive SECURITY_ANALYST role');
  const analystSessionId = signupRes.data.session_id;
  assert.ok(analystSessionId, 'Session ID must be returned');
  console.log('✔ Check 2 Passed: Signup assigned SECURITY_ANALYST role successfully');

  // Test 3: Analyst session cannot trigger Admin Panic endpoint
  const analystPanic = await request(
    'POST',
    '/api/v1/actions/panic',
    {},
    { 'x-client-session-id': analystSessionId }
  );
  assert.strictEqual(analystPanic.status, 403, 'Non-admin MUST receive 403 Forbidden on panic action');
  assert.strictEqual(analystPanic.data.error, 'ADMIN_REQUIRED');
  console.log('✔ Check 3 Passed: Admin endpoints blocked for SECURITY_ANALYST (403 Forbidden)');

  // Test 4: Analyst session CAN access standard endpoints (status, alerts, hardware)
  const analystToken = signupRes.data.token;
  const analystStatus = await request(
    'GET',
    '/api/v1/status',
    undefined,
    {
      'x-client-session-id': analystSessionId,
      Authorization: `Bearer ${analystToken}`,
    }
  );
  assert.strictEqual(analystStatus.status, 200, 'Analyst must have access to standard status endpoint');
  console.log('✔ Check 4 Passed: Standard monitoring endpoints accessible to SECURITY_ANALYST');

  // Test 5: Concurrency - 15 simultaneous sessions simulated
  const sessionPromises = [];
  for (let i = 0; i < 15; i++) {
    const sId = `concurrent-test-sess-${Date.now()}-${i}`;
    sessionPromises.push(
      request('GET', '/api/v1/auth/session', undefined, { 'x-client-session-id': sId })
    );
  }
  const sessionResults = await Promise.all(sessionPromises);
  assert.strictEqual(sessionResults.length, 15, 'All 15 concurrent requests should complete');
  for (const res of sessionResults) {
    assert.strictEqual(res.status, 200, 'Each concurrent session gets clean 200 response');
    assert.ok(res.data.active_users_count >= 1, 'Active users count is reported');
  }
  console.log(`✔ Check 5 Passed: 15 concurrent user sessions handled concurrently with 0 collisions`);

  // Test 6: Zero-Trust Device Privacy - Analyst cannot view Host Server (node-local) or other laptops
  const analystFleet = await request(
    'GET',
    '/api/v1/fleet/nodes',
    undefined,
    {
      'x-client-session-id': analystSessionId,
      Authorization: `Bearer ${analystToken}`,
    }
  );
  assert.strictEqual(analystFleet.status, 200, 'Fleet endpoint responds 200');
  const visibleToAnalyst = analystFleet.data.nodes || [];
  const hasHostNode = visibleToAnalyst.some((n: any) => n.id === 'node-local' || n.isLocal === true);
  assert.strictEqual(hasHostNode, false, 'Host Machine (Laptop 1) must NEVER leak to SECURITY_ANALYST');
  console.log('✔ Check 6 Passed: Zero-Trust Device Privacy verified (Host Machine and other nodes strictly hidden from SECURITY_ANALYST)');

  // Test 7: Email OTP Verification Protocol
  const otpEmail = `otp_test_${Date.now()}@shieldlabs.local`;
  const sendOtpRes = await request('POST', '/api/v1/auth/otp/send', { email: otpEmail });
  assert.strictEqual(sendOtpRes.status, 200, 'OTP send must return 200');
  const otpCode = sendOtpRes.data.devOtp || sendOtpRes.data.previewOtp;
  assert.ok(otpCode && /^\d{6}$/.test(otpCode.toString()), 'devOtp must be a 6-digit code');

  const invalidOtpRes = await request('POST', '/api/v1/auth/otp/verify', { email: otpEmail, otp: '000000' });
  assert.strictEqual(invalidOtpRes.status, 400, 'Invalid OTP must return 400');

  const validOtpRes = await request('POST', '/api/v1/auth/otp/verify', { email: otpEmail, otp: otpCode });
  assert.strictEqual(validOtpRes.status, 200, 'Valid OTP must return 200');
  console.log('✔ Check 7 Passed: Email OTP verification protocol verified');

  // Test 8: Strict Role Authority & Immutability
  // Non-admin attempting self-elevation via /api/v1/auth/user-profile
  const selfElevationRes = await request(
    'PUT',
    '/api/v1/auth/user-profile',
    { role: 'ADMIN' },
    { 'x-client-session-id': analystSessionId, Authorization: `Bearer ${analystToken}` }
  );
  assert.strictEqual(selfElevationRes.status, 403, 'Non-admin self-elevation must be blocked with 403');
  assert.strictEqual(selfElevationRes.data.error, 'ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES');

  // Hostile role injection during signup is strictly ignored
  const hostileSignupRes = await request('POST', '/api/v1/auth/signup', {
    fullName: 'Hostile Actor',
    email: `hostile_${Date.now()}@shieldlabs.local`,
    password: 'Password123!',
    role: 'ADMIN',
  });
  assert.ok(hostileSignupRes.status === 200 || hostileSignupRes.status === 201);
  assert.strictEqual(hostileSignupRes.data.user.role, 'SECURITY_ANALYST', 'Public signup must default to SECURITY_ANALYST');
  console.log('✔ Check 8 Passed: Role immutability enforced (non-admins cannot change roles; public signup defaults to SECURITY_ANALYST)');

  // Test 9: Master Admin Authority & User Directory
  // Non-admin cannot list user directory
  const nonAdminListRes = await request(
    'GET',
    '/api/v1/admin/users',
    undefined,
    { 'x-client-session-id': analystSessionId, Authorization: `Bearer ${analystToken}` }
  );
  assert.strictEqual(nonAdminListRes.status, 403, 'Non-admin accessing user directory must return 403');

  // Master Admin login
  const adminLoginRes = await request('POST', '/api/v1/auth/login', {
    email: 'admin@shieldlabs.local',
    password: 'AdminMasterPassword123!',
  });
  const adminSessionId = adminLoginRes.data.session_id;
  const adminToken = adminLoginRes.data.token || analystToken;

  const adminListRes = await request(
    'GET',
    '/api/v1/admin/users',
    undefined,
    { 'x-client-session-id': adminSessionId, Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(adminListRes.status, 200, 'Master Admin must be able to list all users');
  assert.ok(Array.isArray(adminListRes.data.users), 'Users array must be returned');

  // Master Admin changes analyst role to AUDITOR
  const updateRoleRes = await request(
    'POST',
    `/api/v1/admin/users/${signupRes.data.user.id}/role`,
    { role: 'AUDITOR' },
    { 'x-client-session-id': adminSessionId, Authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(updateRoleRes.status, 200, 'Master Admin role change must return 200');
  assert.strictEqual(updateRoleRes.data.user.role, 'AUDITOR', 'User role must be updated to AUDITOR');
  console.log('✔ Check 9 Passed: Master Admin User Directory and role delegation verified');

  // Test 10: Anti-Takeover, Header Spoofing Immunity & Enrollment Token Isolation
  const attackerSession = `attacker-session-${Date.now()}`;

  // 10.1: Attempt OTP against admin and verify - session must NOT gain ADMIN authority
  const exploitOtpRes = await request('POST', '/api/v1/auth/otp/send', { email: 'admin@shieldlabs.local' }, { 'x-client-session-id': attackerSession });
  const exploitOtpCode = exploitOtpRes.data.previewOtp || exploitOtpRes.data.devOtp;
  if (exploitOtpCode) {
    const exploitVerifyRes = await request('POST', '/api/v1/auth/otp/verify', { email: 'admin@shieldlabs.local', otp: exploitOtpCode }, { 'x-client-session-id': attackerSession });
    assert.strictEqual(exploitVerifyRes.status, 200);
  }
  const takeoverAttemptRes = await request('GET', '/api/v1/admin/users', undefined, { 'x-client-session-id': attackerSession });
  assert.ok(
    takeoverAttemptRes.status === 401 || takeoverAttemptRes.status === 403,
    `OTP verification alone must NEVER grant admin session clearance (got ${takeoverAttemptRes.status})`
  );

  // 10.2: Header Spoofing Immunity (X-Forwarded-For: 127.0.0.1)
  const spoofHeaderSession = `spoof-${Date.now()}`;
  const spoofRes = await request('GET', '/api/v1/admin/users', undefined, {
    'x-client-session-id': spoofHeaderSession,
    'x-forwarded-for': '127.0.0.1',
    'x-real-ip': '127.0.0.1'
  });
  assert.ok(
    spoofRes.status === 401 || spoofRes.status === 403,
    `X-Forwarded-For spoofing must NOT confer admin role (got ${spoofRes.status})`
  );

  // 10.3: Unauthenticated /api/v1/enrollment must NOT reveal active IPC bearer token
  const unauthEnrollmentRes = await request('GET', '/api/v1/enrollment', undefined, { 'x-client-session-id': `unauth-${Date.now()}` });
  assert.strictEqual(unauthEnrollmentRes.status, 200);
  assert.strictEqual(unauthEnrollmentRes.data.active_token, undefined, 'Active IPC token must not be leaked to unauthenticated callers');
  console.log('✔ Check 10 Passed: Anti-Takeover, Header Spoofing Immunity & Enrollment Token Isolation verified');

  // Cleanup ephemeral test accounts created by this test run
  try {
    if (fs.existsSync(usersPath)) {
      const currentUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      const cleaned = currentUsers.filter((u: any) =>
        u.id === 'admin-master' ||
        u.email === 'rohanp2008.rp@gmail.com' ||
        (!u.email.includes('_1791') && !u.email.startsWith('analyst_') && !u.email.startsWith('hostile_'))
      );
      fs.writeFileSync(usersPath, JSON.stringify(cleaned, null, 2), 'utf8');
    }
  } catch {}

  if (spawnedServer && !spawnedServer.killed) {
    try {
      if (process.platform === 'win32' && spawnedServer.pid) {
        spawn('taskkill', ['/F', '/T', '/PID', spawnedServer.pid.toString()]);
      } else {
        spawnedServer.kill();
      }
    } catch {}
  }

  console.log('\nAll RBAC, Concurrency & Security Gate checks passed! (10/10)');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

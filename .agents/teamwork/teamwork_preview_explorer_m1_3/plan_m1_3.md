# Technical Recommendations: Milestone 1 Part C
**Auth Gating & Master Admin Endpoints**

- **Working Directory**: `.agents/teamwork/teamwork_preview_explorer_m1_3/`
- **Target Files**: `server.ts`
- **Related Files**: `src/types/security.ts`, `data/users.json`, `tests/rbac_concurrency_test.ts`
- **Integrity Mode**: demo

---

## 1. Executive Summary

Milestone 1 Part C completes the server-side identity, authentication gating, and role governance architecture for the Shield Labs Bot platform:
1. **Zero Public Role Selection & Registration Hardcoding (`/api/v1/auth/signup`)**:
   - Public registration strictly hardcodes `role: 'SECURITY_ANALYST'` and ignores any client-supplied role.
   - Mandatory capture of `phone` and `country`.
   - Account created in unverified state (`isVerified: false`, `disabled: false`).
   - Automatically triggers initial OTP generation (using `crypto.randomInt(100000, 1000000)`), dispatches/logs the OTP, and returns `previewOtp` in the response for zero-friction local/offline testing.
2. **Strict Verification & Account Status Gating (`/api/v1/auth/login`)**:
   - Following valid credential/password verification, authenticating callers are strictly gated:
     - If `user.disabled === true` -> HTTP 403 `ACCOUNT_DISABLED`.
     - If `user.isVerified === false` -> HTTP 403 `ACCOUNT_UNVERIFIED`.
   - Only accounts that are verified and active are granted authenticated console sessions.
3. **Anti-Tampering Guard on Profile Management (`/api/v1/auth/user-profile`)**:
   - Strips role modification capability from self-service user profile endpoints (`PUT` & `POST /api/v1/auth/user-profile`).
   - Any attempt by non-admin callers to provide a divergent `role` payload is firmly denied with HTTP 403 `ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES`.
   - Self-profile updates are strictly confined to `fullName`, `phone`, `country`, and `deviceName`.
4. **Master Admin Management Cockpit Endpoints (`/api/v1/admin/*`)**:
   - Protected by `requireAdmin` middleware (exclusively accessible to `ADMIN` clearance).
   - `GET /api/v1/admin/users`: Returns all registered users with live online status (derived from active in-memory `clientSessions`), device names, phone, country, role, verified, and disabled flags. Excludes `passwordHash` and `passwordSalt`.
   - `PATCH /api/v1/admin/users/:id/role`: Permits Master Admin to reassign roles (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`), with immutable protection preventing demotion of the canonical Master Admin (`admin-master` / `admin@shieldlabs.local`).
   - `PATCH /api/v1/admin/users/:id/status`: Enables or disables user accounts, revoking active sessions on disable, with immutable protection preventing disabling the Master Admin account.

---

## 2. Investigation & Current State Observations in `server.ts`

### 2.1 File: `server.ts` Lines 807–944 (`/api/v1/auth/signup`)
- **Current Lines 807–850**:
  ```typescript
  app.post('/api/v1/auth/signup', (req: Request, res: Response) => {
    const fullName = req.body.fullName || req.body.name;
    const { email, phone, country, password, pin, deviceName, otp } = req.body;
    ...
    const isInitialSetup = pinHash === null && registeredUsers.length === 0;

    // Verify OTP if not initial setup and OTP was provided/requested
    if (!isInitialSetup && otp) {
      ...
    }

    const userRole: 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' = isInitialSetup ? 'ADMIN' : 'SECURITY_ANALYST';
  ```
- **Observations & Gaps**:
  1. `userRole` dynamically evaluates `isInitialSetup ? 'ADMIN' : 'SECURITY_ANALYST'`. However, Milestone 1 Part A already seeds the canonical Master Admin account `admin-master` (`admin@shieldlabs.local`) on server boot. Public registration must NEVER award `ADMIN`. Every public registration must strictly and unconditionally receive `SECURITY_ANALYST`.
  2. `isVerified` is hardcoded to `true` at line 896 (`isVerified: true`). This bypasses the OTP gating requirement (R3) that blocks account activation until the 6-digit OTP is verified.
  3. `signup` currently does not generate an OTP if one was not requested beforehand. In the new flow, submitting the registration form should create the unverified account, immediately issue the 6-digit OTP, store it in `pendingOtps`, and return `previewOtp` in the response.
  4. If `phone` and `country` are empty or omitted, they are stored as `undefined`. They should be cleanly captured and stored as non-null strings (`""` if empty).

### 2.2 File: `server.ts` Lines 946–1079 (`/api/v1/auth/login`)
- **Current Lines 958–1030**:
  ```typescript
  if (email && typeof email === 'string' && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const user = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    ...
    const candidateHash = hashPin(credential.trim(), user.passwordSalt);
    const isMatch = crypto.timingSafeEqual(...);
    if (!isMatch) {
      ...
    }

    user.lastLoginUtc = new Date().toISOString();
    saveUsersToDisk();

    const session = getClientSession(req);
    session.isLocked = false;
    session.role = user.role;
    ...
    return res.json({ success: true, ... user: { ... } });
  }
  ```
- **Observations & Gaps**:
  1. No check exists for `user.disabled`. A disabled user can currently log in without restriction.
  2. No check exists for `user.isVerified`. An unverified user can currently log in immediately.
  3. Per requirements:
     - `if (user.disabled)` must return HTTP 403 with `error: 'ACCOUNT_DISABLED'`.
     - `if (user.isVerified === false)` must return HTTP 403 with `error: 'ACCOUNT_UNVERIFIED'`.

### 2.3 File: `server.ts` Lines 1354–1460 (`/api/v1/auth/user-profile`)
- **Current Lines 1369–1378 & 1431–1439**:
  ```typescript
  if (role && ['ADMIN', 'SECURITY_ANALYST', 'AUDITOR', 'NO_ROLE'].includes(role) && role !== session.role) {
    if (session.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES',
        message: 'Security policy violation: Only the Master Administrator can change security clearance roles.',
      });
    }
    session.role = role;
    consoleUserRole = role;
  }
  ```
- **Observations & Gaps**:
  1. While non-admin role alteration is currently blocked with `ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES`, having `role` in the body of `user-profile` creates confusion with the dedicated admin role delegation endpoint.
  2. Furthermore, lines 1386–1393 do not update `matchedUser.role` in `registeredUsers`, meaning that even if an admin changed their role in session, it wasn't persisted to `data/users.json`.
  3. The self-profile modal in `UserProfileModal.tsx` already removed the role dropdown. To guarantee absolute role isolation (R1 & Acceptance Criteria: *"Non-admin users cannot alter their own or peer roles"*), `user-profile` should reject any non-admin role elevation attempt and explicitly restrict role delegation to the Master Admin Cockpit endpoint.

### 2.4 File: `server.ts` (Absent Admin Endpoints)
- Grepping `server.ts` for `/api/v1/admin/users` returns zero matches.
- There are currently NO endpoints for:
  - `GET /api/v1/admin/users`
  - `PATCH /api/v1/admin/users/:id/role`
  - `PATCH /api/v1/admin/users/:id/status`
- The Master Admin Cockpit (M3) requires these endpoints to inspect registered users, live activity status, device names, and delegate roles or disable accounts.

---

## 3. Concrete Formulations & Implementation Specifications

### 3.1 Endpoint: `POST /api/v1/auth/signup`

#### Requirements
1. Capture `fullName`, `email`, `phone`, `country`, `password`, `deviceName`.
2. Hardcode `role: 'SECURITY_ANALYST'` (discard any client `role` field).
3. Set `isVerified: false` and `disabled: false`.
4. Trigger initial 6-digit OTP generation via `crypto.randomInt(100000, 1000000)`.
5. Store OTP in `pendingOtps` Map with 10-minute expiry.
6. Console log OTP (`[Shield Labs Bot] 📧 Verification OTP for <email>: <otp>`) and dispatch via SMTP if configured.
7. Return `previewOtp` (and `devOtp` for backward compatibility) and user summary with `isVerified: false`.
8. Protect canonical Master Admin email (`admin@shieldlabs.local`) from public registration overwrite (return 409 Conflict).

#### Formulated Code for `server.ts`
```typescript
app.post('/api/v1/auth/signup', (req: Request, res: Response) => {
  const fullName = req.body.fullName || req.body.name;
  const { email, phone, country, password, pin, deviceName, otp } = req.body;
  const credential = password || pin;

  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return res.status(400).json({ ok: false, error: 'INVALID_NAME', message: 'Full name is required.' });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ ok: false, error: 'INVALID_EMAIL', message: 'Valid email address is required.' });
  }

  if (!credential || typeof credential !== 'string' || credential.trim().length < 4) {
    return res.status(400).json({ ok: false, error: 'INVALID_CREDENTIAL', message: 'Password must be at least 4 characters in length.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Root Authority Protection: Canonical Master Admin cannot be registered or overwritten publicly
  if (cleanEmail === 'admin@shieldlabs.local') {
    return res.status(409).json({
      ok: false,
      error: 'RESERVED_ROOT_ACCOUNT',
      message: 'The Master Administrator account is canonical and cannot be registered publicly.',
    });
  }

  const existingIdx = registeredUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (existingIdx >= 0 && registeredUsers[existingIdx].isVerified) {
    return res.status(409).json({
      ok: false,
      error: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email address already exists. Please sign in.',
    });
  }

  // Strict Role Authority Gate: Public registration ALWAYS defaults to SECURITY_ANALYST.
  // Any role passed in the client payload is discarded.
  const userRole = 'SECURITY_ANALYST';

  // Check if client provided a pre-requested valid OTP (backward compatibility)
  let initialVerified = false;
  if (otp) {
    const entry = pendingOtps.get(cleanEmail);
    if (entry && entry.otp === otp.toString().trim() && Date.now() <= entry.expiresAtUtc) {
      initialVerified = true;
      pendingOtps.delete(cleanEmail);
    }
  }

  // Issue fresh 6-digit OTP for account activation
  const generatedOtp = crypto.randomInt(100000, 1000000).toString();
  if (!initialVerified) {
    pendingOtps.set(cleanEmail, {
      email: cleanEmail,
      otp: generatedOtp,
      expiresAtUtc: Date.now() + 10 * 60 * 1000,
    });
    console.log(`[Shield Labs Bot] 📧 Verification OTP for ${cleanEmail}: ${generatedOtp}`);
  }

  const session = getClientSession(req);
  session.userName = fullName.trim();
  session.email = cleanEmail;
  session.role = userRole;
  if (deviceName && typeof deviceName === 'string' && deviceName.trim()) {
    session.deviceName = deviceName.trim();
  }
  // Session locked until OTP verified
  session.isLocked = !initialVerified;
  session.lastActivityUtc = Date.now();

  // Persist user account into data/users.json
  const userSalt = crypto.randomBytes(16).toString('hex');
  const userHash = hashPin(credential.trim(), userSalt);
  const userId = existingIdx >= 0 ? registeredUsers[existingIdx].id : `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const storedUser: StoredUser = {
    id: userId,
    fullName: fullName.trim(),
    email: cleanEmail,
    phone: (phone && typeof phone === 'string' ? phone.trim() : '') || '',
    country: (country && typeof country === 'string' ? country.trim() : '') || '',
    passwordHash: userHash,
    passwordSalt: userSalt,
    role: userRole,
    deviceName: (deviceName && typeof deviceName === 'string' && deviceName.trim()) || session.deviceName || `Laptop-${session.clientIp}`,
    isVerified: initialVerified,
    disabled: false,
    createdAtUtc: existingIdx >= 0 ? registeredUsers[existingIdx].createdAtUtc : new Date().toISOString(),
    lastLoginUtc: initialVerified ? new Date().toISOString() : undefined,
  };

  if (existingIdx >= 0) {
    registeredUsers[existingIdx] = storedUser;
  } else {
    registeredUsers.push(storedUser);
  }
  saveUsersToDisk();

  recordEvent('auth.user.signup', 'info', 1.0, 'auth_service', storedUser.id, {
    fullName: storedUser.fullName,
    email: storedUser.email,
    role: storedUser.role,
    phone: storedUser.phone,
    country: storedUser.country,
    isVerified: storedUser.isVerified,
    clientIp: session.clientIp,
  });

  res.json({
    ok: true,
    success: true,
    message: initialVerified
      ? `Account created and verified successfully for ${storedUser.fullName}.`
      : `Account created. A 6-digit verification code has been dispatched to ${cleanEmail}.`,
    session_id: session.sessionId,
    token: IPC_SESSION_TOKEN,
    previewOtp: initialVerified ? undefined : generatedOtp,
    devOtp: initialVerified ? undefined : generatedOtp,
    user: {
      id: storedUser.id,
      fullName: storedUser.fullName,
      email: storedUser.email,
      phone: storedUser.phone,
      country: storedUser.country,
      role: storedUser.role,
      deviceName: storedUser.deviceName,
      isVerified: storedUser.isVerified,
      disabled: storedUser.disabled,
      createdAtUtc: storedUser.createdAtUtc,
    },
    active_users_count: getActiveUsersCount(),
  });
});
```

---

### 3.2 Endpoint: `POST /api/v1/auth/login` (Gating Logic)

#### Requirements
1. Following credential match via `hashPin` + `crypto.timingSafeEqual`:
   - Check `if (user.disabled) -> 403 ACCOUNT_DISABLED`
   - Check `if (user.isVerified === false) -> 403 ACCOUNT_UNVERIFIED`
2. If gated, return HTTP 403 Forbidden with exact error codes.
3. If verified and active, unlock session, update `lastLoginUtc`, and return 200 OK with session credentials and user profile.

#### Formulated Code for `server.ts`
```typescript
app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { email, password, pin } = req.body;
  const credential = password || pin;

  if (lockoutUntilUtc && new Date(lockoutUntilUtc).getTime() > Date.now()) {
    const remaining = Math.ceil((new Date(lockoutUntilUtc).getTime() - Date.now()) / 1000);
    return res.status(429).json({
      error: 'CONSOLE_LOCKED_OUT',
      message: `Too many failed attempts. Console locked for security. Try again in ${remaining}s.`,
    });
  }

  // 1. Authenticate via Registered User Email & Password
  if (email && typeof email === 'string' && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const user = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({
        error: 'USER_NOT_FOUND',
        message: 'No account registered with this email address. Please create an account.',
      });
    }

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({
        error: 'CREDENTIAL_REQUIRED',
        message: 'Password or PIN is required.',
      });
    }

    const candidateHash = hashPin(credential.trim(), user.passwordSalt);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(user.passwordHash, 'hex')
    );

    if (!isMatch) {
      failedUnlockAttempts++;
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Incorrect password. Please verify and try again.',
      });
    }

    // --- GATE 1: Check Account Disabled Status ---
    if (user.disabled) {
      return res.status(403).json({
        ok: false,
        error: 'ACCOUNT_DISABLED',
        message: 'This account has been disabled by the Master Administrator. Access denied.',
      });
    }

    // --- GATE 2: Check Email OTP Verification Status ---
    if (user.isVerified === false) {
      return res.status(403).json({
        ok: false,
        error: 'ACCOUNT_UNVERIFIED',
        message: 'Account email has not been verified yet. Please enter the 6-digit OTP code sent to your email to activate access.',
      });
    }

    user.lastLoginUtc = new Date().toISOString();
    saveUsersToDisk();

    const session = getClientSession(req);
    session.isLocked = false;
    session.role = user.role;
    session.userName = user.fullName;
    session.email = user.email;
    session.deviceName = user.deviceName;
    session.lastActivityUtc = Date.now();

    failedUnlockAttempts = 0;
    lockoutUntilUtc = null;

    recordEvent('auth.user.login', 'info', 1.0, 'auth_service', user.id, {
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      clientIp: session.clientIp,
    });

    return res.json({
      ok: true,
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      session_id: session.sessionId,
      token: IPC_SESSION_TOKEN,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '',
        country: user.country || '',
        role: user.role,
        deviceName: user.deviceName,
        isVerified: user.isVerified ?? true,
        disabled: user.disabled ?? false,
        createdAtUtc: user.createdAtUtc,
        lastLoginUtc: user.lastLoginUtc,
      },
      active_users_count: getActiveUsersCount(),
    });
  }

  // 2. Master PIN Authentication (Local Console Owner)
  if (pin && typeof pin === 'string') {
    if (!pinHash) {
      return res.status(400).json({
        error: 'SETUP_REQUIRED',
        message: 'Master PIN not configured yet.',
      });
    }
    const candidateHash = hashPin(pin.trim(), pinSalt);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(pinHash, 'hex')
    );
    if (isMatch) {
      const session = getClientSession(req);
      session.isLocked = false;
      session.role = 'ADMIN';
      session.userName = consoleUserName;
      session.deviceName = consoleDeviceName;
      session.email = consoleUserEmail;
      session.lastActivityUtc = Date.now();

      failedUnlockAttempts = 0;
      lockoutUntilUtc = null;

      return res.json({
        ok: true,
        success: true,
        message: 'Console unlocked successfully with Master PIN.',
        session_id: session.sessionId,
        token: IPC_SESSION_TOKEN,
        user: {
          id: `usr-admin-${session.sessionId}`,
          fullName: consoleUserName,
          email: consoleUserEmail,
          phone: '+1-800-555-0199',
          country: 'United States',
          role: 'ADMIN',
          deviceName: consoleDeviceName,
          isVerified: true,
          disabled: false,
          createdAtUtc: new Date().toISOString(),
        },
        active_users_count: getActiveUsersCount(),
      });
    }
  }

  return res.status(401).json({
    error: 'INVALID_CREDENTIALS',
    message: 'Invalid credentials. Please provide valid email and password or Master PIN.',
  });
});
```

---

### 3.3 Endpoint: `PUT` / `POST /api/v1/auth/user-profile` (Role Elevation Removal)

#### Requirements
1. Remove all self-service role alteration logic from `/api/v1/auth/user-profile`.
2. Reject any attempt to provide a different role with HTTP 403 `ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES`.
3. Allow safe updates to `fullName`, `phone`, `country`, and `deviceName`.
4. Ensure `matchedUser.role` in `data/users.json` can NEVER be modified through this endpoint.

#### Formulated Code for `server.ts`
```typescript
// Update user & device profile (Self-Service)
app.put('/api/v1/auth/user-profile', (req: Request, res: Response) => {
  const session = getClientSession(req);
  const { fullName, user_name, email, role, phone, country, deviceName, device_name } = req.body;
  const name = fullName || user_name;
  const dev = deviceName || device_name;

  // Anti-Tampering: Strict Role Isolation
  // Self-profile edits CANNOT alter clearance roles. Role delegation is restricted to Master Admin via /api/v1/admin/users/:id/role
  if (role && role !== session.role) {
    return res.status(403).json({
      ok: false,
      error: 'ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES',
      message: 'Security policy violation: Only the Master Administrator can change security clearance roles.',
    });
  }

  if (typeof name === 'string' && name.trim()) {
    consoleUserName = name.trim();
    session.userName = name.trim();
  }
  if (typeof email === 'string' && email.trim()) {
    consoleUserEmail = email.trim().toLowerCase();
    session.email = email.trim().toLowerCase();
  }
  if (typeof dev === 'string' && dev.trim()) {
    consoleDeviceName = dev.trim();
    session.deviceName = dev.trim();
    enrollmentState.device_name = consoleDeviceName;
  }

  // Update in registeredUsers ledger
  const matchedUser = registeredUsers.find((u) => u.email.toLowerCase() === (session.email || '').toLowerCase());
  if (matchedUser) {
    if (name) matchedUser.fullName = name.trim();
    if (phone !== undefined) matchedUser.phone = typeof phone === 'string' ? phone.trim() : '';
    if (country !== undefined) matchedUser.country = typeof country === 'string' ? country.trim() : '';
    if (dev) matchedUser.deviceName = dev.trim();
    // matchedUser.role is NEVER updated here!
    saveUsersToDisk();
  }

  saveVaultToDisk();
  recordEvent(
    'auth.profile.updated',
    'info',
    1.0,
    'auth:local_console',
    'user:device_owner',
    { user_name: session.userName, email: session.email, role: session.role, device_name: session.deviceName }
  );

  res.json({
    ok: true,
    success: true,
    user: {
      id: matchedUser?.id || `usr-${session.sessionId}`,
      fullName: session.userName,
      email: session.email,
      phone: matchedUser?.phone || '',
      country: matchedUser?.country || '',
      role: session.role,
      deviceName: session.deviceName,
      isVerified: matchedUser?.isVerified ?? true,
      disabled: matchedUser?.disabled ?? false,
    },
  });
});

// Alias for POST /api/v1/auth/user-profile
app.post('/api/v1/auth/user-profile', (req: Request, res: Response) => {
  // Delegate directly to the PUT handler logic
  const session = getClientSession(req);
  const { role } = req.body;
  if (role && role !== session.role) {
    return res.status(403).json({
      ok: false,
      error: 'ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES',
      message: 'Security policy violation: Only the Master Administrator can change security clearance roles.',
    });
  }
  // Re-use PUT handler logic
  return (app as any)._router.handle(Object.assign(req, { method: 'PUT' }), res, () => {});
});
```

---

### 3.4 Master Admin Cockpit Endpoints (`/api/v1/admin/*`)

#### A. Endpoint: `GET /api/v1/admin/users`
- **Protection**: `requireAdmin` (403 `ADMIN_REQUIRED` if non-admin).
- **Functionality**:
  - Maps `registeredUsers` to `StoredUserSummary` array.
  - Computes `isOnline`: checks if `clientSessions` contains an active (unlocked, active within past 15 minutes) session for the user's email, or if local console matches.
  - Strips `passwordHash` and `passwordSalt`.
- **Formulated Code**:
  ```typescript
  app.get('/api/v1/admin/users', requireAdmin, (_req: Request, res: Response) => {
    const FIFTEEN_MINS_AGO = Date.now() - 15 * 60 * 1000;

    const userSummaries = registeredUsers.map((u) => {
      // Check active sessions in in-memory clientSessions ledger
      const isSessionOnline = Array.from(clientSessions.values()).some(
        (s) =>
          s.email &&
          s.email.toLowerCase() === u.email.toLowerCase() &&
          !s.isLocked &&
          s.lastActivityUtc > FIFTEEN_MINS_AGO
      );

      const isConsoleOnline =
        u.email.toLowerCase() === consoleUserEmail.toLowerCase() &&
        !isConsoleLocked &&
        lastActivityUtc > FIFTEEN_MINS_AGO;

      const isOnline = isSessionOnline || isConsoleOnline;

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone || '',
        country: u.country || '',
        role: u.role,
        isVerified: Boolean(u.isVerified),
        disabled: Boolean(u.disabled),
        deviceName: u.deviceName || 'Personal-PC',
        isOnline,
        createdAtUtc: u.createdAtUtc,
        lastLoginUtc: u.lastLoginUtc,
      };
    });

    res.json({
      ok: true,
      success: true,
      users: userSummaries,
      total: userSummaries.length,
      active_online_count: userSummaries.filter((u) => u.isOnline).length,
    });
  });
  ```

#### B. Endpoint: `PATCH /api/v1/admin/users/:id/role`
- **Protection**: `requireAdmin`.
- **Validation**:
  - `role` must be one of `'ADMIN'`, `'SECURITY_ANALYST'`, `'AUDITOR'`.
  - Target user must exist.
  - **Master Admin Root Immutability**: If target user is `admin-master` / `admin@shieldlabs.local`, demoting away from `ADMIN` is strictly forbidden (returns HTTP 400 `ROOT_ADMIN_IMMUTABLE`).
- **Effect**:
  - Updates `targetUser.role`.
  - Synchronizes active `clientSessions` with the new role.
  - Atomic disk persistence (`saveUsersToDisk()`).
  - Records audit event `admin.user.role_delegated`.
- **Formulated Code**:
  ```typescript
  const handleUpdateUserRole = (req: Request, res: Response) => {
    const targetId = req.params.id;
    const { role: newRole } = req.body;

    if (!newRole || !['ADMIN', 'SECURITY_ANALYST', 'AUDITOR'].includes(newRole)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_ROLE',
        message: 'Valid role is required (ADMIN, SECURITY_ANALYST, or AUDITOR).',
      });
    }

    const targetUser = registeredUsers.find(
      (u) => u.id === targetId || u.email.toLowerCase() === targetId.toLowerCase()
    );

    if (!targetUser) {
      return res.status(404).json({
        ok: false,
        error: 'USER_NOT_FOUND',
        message: 'No registered user found with the specified ID or email.',
      });
    }

    // Root Authority Protection: Canonical Master Admin can NEVER be demoted
    if (
      (targetUser.id === 'admin-master' || targetUser.email.toLowerCase() === 'admin@shieldlabs.local') &&
      newRole !== 'ADMIN'
    ) {
      return res.status(400).json({
        ok: false,
        error: 'ROOT_ADMIN_IMMUTABLE',
        message: 'The canonical Master Administrator role cannot be demoted.',
      });
    }

    const previousRole = targetUser.role;
    targetUser.role = newRole;

    // Synchronize active client sessions
    for (const session of clientSessions.values()) {
      if (session.email && session.email.toLowerCase() === targetUser.email.toLowerCase()) {
        session.role = newRole;
      }
    }
    if (targetUser.email.toLowerCase() === consoleUserEmail.toLowerCase()) {
      consoleUserRole = newRole;
    }

    saveUsersToDisk();

    const adminSession = getClientSession(req);
    recordEvent('admin.user.role_delegated', 'info', 1.0, 'admin_cockpit', targetUser.id, {
      delegatedBy: adminSession.email || adminSession.userName,
      targetUserId: targetUser.id,
      targetEmail: targetUser.email,
      previousRole,
      newRole,
    });

    res.json({
      ok: true,
      success: true,
      message: `Role for ${targetUser.fullName} (${targetUser.email}) successfully changed from ${previousRole} to ${newRole}.`,
      user: {
        id: targetUser.id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        phone: targetUser.phone || '',
        country: targetUser.country || '',
        role: targetUser.role,
        isVerified: Boolean(targetUser.isVerified),
        disabled: Boolean(targetUser.disabled),
        deviceName: targetUser.deviceName,
        createdAtUtc: targetUser.createdAtUtc,
        lastLoginUtc: targetUser.lastLoginUtc,
      },
    });
  };

  app.patch('/api/v1/admin/users/:id/role', requireAdmin, handleUpdateUserRole);
  app.put('/api/v1/admin/users/:id/role', requireAdmin, handleUpdateUserRole);
  ```

#### C. Endpoint: `PATCH /api/v1/admin/users/:id/status`
- **Protection**: `requireAdmin`.
- **Validation**:
  - `disabled` must be a boolean.
  - Target user must exist.
  - **Master Admin Root Immutability**: If target user is `admin-master` / `admin@shieldlabs.local`, disabling is strictly forbidden (returns HTTP 400 `ROOT_ADMIN_IMMUTABLE`).
- **Effect**:
  - Updates `targetUser.disabled`.
  - If `disabled === true`, immediately revokes and locks active sessions for that user.
  - Atomic disk persistence (`saveUsersToDisk()`).
  - Records audit event `admin.user.status_changed`.
- **Formulated Code**:
  ```typescript
  const handleUpdateUserStatus = (req: Request, res: Response) => {
    const targetId = req.params.id;
    const { disabled } = req.body;

    if (typeof disabled !== 'boolean') {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_STATUS',
        message: 'Status payload must include a boolean "disabled" field.',
      });
    }

    const targetUser = registeredUsers.find(
      (u) => u.id === targetId || u.email.toLowerCase() === targetId.toLowerCase()
    );

    if (!targetUser) {
      return res.status(404).json({
        ok: false,
        error: 'USER_NOT_FOUND',
        message: 'No registered user found with the specified ID or email.',
      });
    }

    // Root Authority Protection: Canonical Master Admin can NEVER be disabled
    if (
      (targetUser.id === 'admin-master' || targetUser.email.toLowerCase() === 'admin@shieldlabs.local') &&
      disabled === true
    ) {
      return res.status(400).json({
        ok: false,
        error: 'ROOT_ADMIN_IMMUTABLE',
        message: 'The canonical Master Administrator account cannot be disabled.',
      });
    }

    targetUser.disabled = disabled;

    // If disabled, immediately revoke and lock any active sessions
    if (disabled) {
      for (const session of clientSessions.values()) {
        if (session.email && session.email.toLowerCase() === targetUser.email.toLowerCase()) {
          session.isLocked = true;
          session.role = 'NO_ROLE';
        }
      }
    }

    saveUsersToDisk();

    const adminSession = getClientSession(req);
    recordEvent('admin.user.status_changed', 'high', 1.0, 'admin_cockpit', targetUser.id, {
      changedBy: adminSession.email || adminSession.userName,
      targetUserId: targetUser.id,
      targetEmail: targetUser.email,
      disabled,
    });

    res.json({
      ok: true,
      success: true,
      message: `Account for ${targetUser.fullName} (${targetUser.email}) has been ${disabled ? 'disabled' : 'enabled'}.`,
      user: {
        id: targetUser.id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        phone: targetUser.phone || '',
        country: targetUser.country || '',
        role: targetUser.role,
        isVerified: Boolean(targetUser.isVerified),
        disabled: Boolean(targetUser.disabled),
        deviceName: targetUser.deviceName,
        createdAtUtc: targetUser.createdAtUtc,
        lastLoginUtc: targetUser.lastLoginUtc,
      },
    });
  };

  app.patch('/api/v1/admin/users/:id/status', requireAdmin, handleUpdateUserStatus);
  app.put('/api/v1/admin/users/:id/status', requireAdmin, handleUpdateUserStatus);
  ```

---

## 4. Middleware & Helper Refinements

### 4.1 Update to `requireAdmin` in `server.ts`
To ensure seamless Master Admin identification across both local IPC sessions and session-token authenticated API calls:
```typescript
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getClientSession(req);
  const isMasterAdminEmail =
    session.email && session.email.toLowerCase() === 'admin@shieldlabs.local';

  if (session.role !== 'ADMIN' && !isMasterAdminEmail) {
    return res.status(403).json({
      ok: false,
      error: 'ADMIN_REQUIRED',
      message: 'Access denied: Master Administrator clearance is required for this action.',
    });
  }
  next();
}
```

---

## 5. Test & Verification Plan

| Verification Item | Expected Observation / Assertion | Command / Test |
|---|---|---|
| **Default Analyst Role** | `POST /api/v1/auth/signup` with `{ role: 'ADMIN' }` returns `user.role === 'SECURITY_ANALYST'` and `user.isVerified === false` | `npm run test:rbac` |
| **Initial OTP Dispatch** | `POST /api/v1/auth/signup` returns `previewOtp` (6 digits) and logs to console | Check response & console |
| **Login Gating - Unverified** | `POST /api/v1/auth/login` for unverified user returns HTTP 403 `ACCOUNT_UNVERIFIED` | Automated assertion in `tests/user_auth_verification.ts` |
| **Login Gating - Disabled** | `POST /api/v1/auth/login` for disabled user returns HTTP 403 `ACCOUNT_DISABLED` | Automated assertion in `tests/user_auth_verification.ts` |
| **Anti-Tampering** | Analyst session calling `PUT /api/v1/auth/user-profile` with `{ role: 'ADMIN' }` gets 403 `ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES` | Automated assertion in `tests/user_auth_verification.ts` |
| **Admin Users Endpoint** | `GET /api/v1/admin/users` returns all registered users with `isOnline`, `deviceName`, `phone`, `country`, `role`, `isVerified`, `disabled`. `passwordHash` is absent | Automated assertion |
| **Admin Role Delegation** | `PATCH /api/v1/admin/users/:id/role` succeeds for Admin, delegates `AUDITOR`, updates user in memory & `data/users.json` | Automated assertion |
| **Root Admin Protection** | `PATCH /api/v1/admin/users/admin-master/role` with `{ role: 'AUDITOR' }` returns 400 `ROOT_ADMIN_IMMUTABLE` | Automated assertion |
| **Build & Typecheck** | `tsc --noEmit` and `npm run build` compile cleanly with 0 errors | `npm run build` |

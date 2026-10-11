# Handoff Report — Authentication & User Flow Survey

**Agent**: `teamwork_preview_explorer_survey_2`  
**Working Directory**: `C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_explorer_survey_2`  
**Handoff Type**: Hard (Survey Investigation Complete)  
**Destination Report**: `survey_report.md`  

---

## 1. Observation

1. **Server-Side Authentication State & Vault** (`server.ts` lines 232–248, 256–331):
   - Local console authentication relies on Master PIN PBKDF2 hash with salt: `crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256').toString('hex')`.
   - Vault state is written to `data/security_vault.json`: stores `pinHash`, `pinSalt`, `recoveryKeyHash`, `recoveryKeySalt`, `isConsoleLocked`, `consoleUserName`, `consoleDeviceName`, `consoleUserEmail`, `consoleUserRole`.
   - Brute-force rate limiting: `failedUnlockAttempts` tracks failed attempts. At >= 5 failures, `lockoutUntilUtc = new Date(Date.now() + 30000).toISOString()` triggers HTTP 429 lockout.

2. **User Storage & Missing Profile Fields** (`server.ts` lines 336–378, `data/users.json`):
   - `StoredUser` interface:
     ```typescript
     export interface StoredUser {
       id: string;
       fullName: string;
       email: string;
       passwordHash: string;
       passwordSalt: string;
       role: 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' | 'NO_ROLE';
       deviceName: string;
       createdAtUtc: string;
       lastLoginUtc?: string;
     }
     ```
   - Persisted in `data/users.json`. Currently contains 13 analyst records and 1 user record, all lacking `phone`, `country`, and `isVerified`.

3. **Current UI Gateways & Refresh Behavior** (`src/App.tsx` lines 62–81, 244–271):
   - `App.tsx` initializes `isConsoleUnlocked = false`.
   - React Query fetches `api.getAuthSession` (`GET /api/v1/auth/session`) using session ID from `localStorage['pcb_client_session_id']`.
   - If `authSession.is_locked || authSession.is_locked_out`, `App.tsx` short-circuits and renders `<LoginPage />`.
   - Background telemetry queries have `enabled: isConsoleUnlocked`, preventing data leakage while locked.
   - On logout (`handleLockConsole`), client calls `api.lockConsole()`, cleans `pcb_saved_pin` and `pcb_remember_session`, and sets `isConsoleUnlocked = false`.

4. **Sign Up Interface Non-Compliance & Missing OTP** (`src/components/LoginPage.tsx` lines 367–477):
   - Collects only: Full Name, Email Address, Password, Confirm Password.
   - Lacks **Phone Number** and **Country** input fields.
   - Upon form submission, calls `api.signupUser(...)` and immediately executes `onLoginSuccess()` without any verification step.
   - There is no OTP generation, verification screen, or dispatch mechanism in the codebase.

5. **Role Tampering in User Settings** (`src/components/UserProfileModal.tsx` lines 256–315):
   - Currently contains an interactive button grid for `['NO_ROLE', 'AUDITOR', 'SECURITY_ANALYST', 'ADMIN']`, allowing users to request role changes from settings.
   - This directly violates R1's requirement: *"Zero Role Selection: Absolutely no role selector, dropdown, or option is displayed anywhere during sign up or in user profile settings."*

6. **Current Test Status & Build**:
   - `cmd /c "npm test"` executes `test:security`, `test:safety`, `test:remote`, `test:fleet`, and `test:rbac`, all passing (exit code 0).
   - `cmd /c "npm run build"` compiles 1,767 modules cleanly with Vite v8.3.3 in 759ms with zero errors (exit code 0).

---

## 2. Logic Chain

1. **Step 1 (User Profile Model Deficiencies)**:
   - *From Observation 2*: `StoredUser` in `server.ts` and `UserProfile` in `src/types/security.ts` only declare `id`, `fullName`, `email`, `role`, `deviceName`, `createdAtUtc`, and `lastLoginUtc`.
   - *Therefore*: To satisfy R1 & R4, `StoredUser`, `UserProfile`, and `data/users.json` must be extended with `phone: string`, `country: string`, and `isVerified: boolean`.

2. **Step 2 (Sign Up & Zero Role Selection Invariant)**:
   - *From Observation 4 & 5*: `LoginPage.tsx` lacks `phone` and `country` inputs, and `UserProfileModal.tsx` renders an active role selector.
   - *Therefore*:
     a. `LoginPage.tsx` must be updated with `phone` and `country` input fields in the Sign Up form.
     b. In `UserProfileModal.tsx`, the role button grid (`lines 256–315`) must be completely removed and replaced with a static, read-only status badge.
     c. Public registration must be strictly hardcoded on both client and server to assign role `SECURITY_ANALYST`.

3. **Step 3 (Dual-Mode Email OTP Verification Engine)**:
   - *From Observation 4*: No OTP generation, storage, or verification endpoints exist anywhere in the codebase.
   - *Therefore*:
     a. `server.ts` must maintain an expiring `activeOtps` ledger generating 6-digit codes via `crypto.randomInt(100000, 1000000)`.
     b. Implement Dual-Mode delivery: Mode A attempts live SMTP dispatch if environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) exist in `.env`; Mode B outputs the OTP to the console and provides an in-app toast preview in demo/local mode.
     c. Implement `POST /api/v1/auth/verify-otp` and `POST /api/v1/auth/resend-otp`.
     d. In `LoginPage.tsx`, upon submitting sign up, transition the user into a 6-digit OTP verification screen, blocking dashboard entry until verified.
     e. In `/api/v1/auth/login`, reject unverified accounts with HTTP 403 `ACCOUNT_UNVERIFIED`.

4. **Step 4 (Master Admin Seed & Delegation Cockpit)**:
   - *From Observation 2 & Requirements R2/R5*:
     a. `server.ts` must ensure a canonical root Master Admin user account exists in `data/users.json` (e.g. `admin-master` / `admin@shieldlabs.local`, `ADMIN`, `isVerified: true`).
     b. Implement `GET /api/v1/admin/users` and `PUT /api/v1/admin/users/:userId/role` restricted via `requireAdmin`.
     c. Provide an Admin Cockpit view to inspect all registered users, their online status, device names, phone, country, and reassign roles.

5. **Step 5 (Backward Compatibility for Existing Test Suite)**:
   - *From Observation 6*: Existing automated tests (`tests/rbac_concurrency_test.ts`, `tests/fleet_deep_cockpit_test.ts`, `tests/release_verification.ts`) unlock the console via `/api/v1/auth/unlock` with Master PIN `1234` or call `/api/v1/auth/signup`.
   - *Therefore*: The Master PIN unlock endpoint and existing test signups must remain fully supported, and test suites must be updated to pass valid phone/country and complete OTP verification so `npm test` continues to pass cleanly.

---

## 3. Caveats

1. **SMTP Configuration**: Live SMTP email delivery depends on user-configured SMTP credentials in `.env`. When credentials are not provided or the machine is offline, the system must seamlessly fall back to Mode B (console output and instant in-app/toast preview) without failing the signup request.
2. **Database Synchronization**: The system currently persists multi-user records locally in `data/users.json` while maintaining an optional cloud table in Supabase (`public.user_profiles`). Local JSON persistence is primary and authoritative for loopback IPC; cloud syncing must remain non-blocking so the console operates flawlessly offline.
3. **No New Dependencies**: Per the project's lazy senior developer rules, OTP generation and validation can be achieved entirely using Node.js built-in `crypto` (`crypto.randomInt`, `crypto.timingSafeEqual`) without adding external NPM packages.

---

## 4. Conclusion

The existing authentication architecture has robust Master PIN PBKDF2 hashing, rate-limiting, and React Query gating, but currently lacks:
1. Phone and Country capture during registration.
2. Complete removal of role selection from `UserProfileModal.tsx`.
3. The 6-digit dual-mode Email OTP verification engine.
4. Account verification gating (`isVerified: false` blocking login).
5. Canonical Master Admin seeding and the User Management Cockpit.

The detailed implementation plan, exact files, schemas, and endpoint specifications have been documented in `survey_report.md`. The codebase is in a clean, passing state (`npm test` passes 100%, `npm run build` succeeds in 759ms).

---

## 5. Verification Method

1. **Inspect Survey Report**:
   - View `C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_explorer_survey_2\survey_report.md`.
2. **Verify Baseline Tests**:
   - Run `cmd /c "npm test"` to verify all existing test suites pass.
3. **Verify Baseline Build**:
   - Run `cmd /c "npm run build"` to verify TypeScript and Vite compilation succeed with 0 errors.
4. **Invalidation Conditions**:
   - The findings would be invalidated if `server.ts` or `LoginPage.tsx` were already modified to capture phone/country or implement OTP verification prior to this report.

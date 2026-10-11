# Comprehensive Authentication & User Flow Survey Report

**Date**: 2026-10-09  
**Agent**: `teamwork_preview_explorer_survey_2`  
**Working Directory**: `C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_explorer_survey_2`  
**Target Project**: Personal-Cybersecurity-Bot (`C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot`)  
**Mission**: Full architectural survey of existing Authentication, User Models, Session Management, UI Gateways, and gap assessment for R1 (Universal Sign In/Up with Zero Role Selection) and R3 (Dual-Mode Email OTP Verification Engine).

---

## Executive Summary

The **Personal-Cybersecurity-Bot** application is a desktop-first Windows security console built with React 19, Vite 8, and Express/TypeScript. Authentication operates on a **hybrid local-first and multi-user model**:
1. **Master PIN Authentication**: Local hardware console access is protected via PBKDF2-salted SHA-256 PIN credentials, brute-force rate-limiting (5 attempts -> 30s lockout), and an emergency 16-character recovery key (`PCB-XXXX-XXXX-XXXX-XXXX`), persisted in `data/security_vault.json`.
2. **Multi-User Email/Password Authentication**: Multi-user accounts are stored persistently in `data/users.json` with PBKDF2 password hashes and salts. Sessions are tracked via in-memory `clientSessions` indexed by `x-client-session-id`.
3. **Current Gaps vs R1 & R3 Requirements**:
   - **R1 Gaps**: The existing Sign Up form in `src/components/LoginPage.tsx` captures only Full Name, Email, Password, and Password Confirmation. It lacks **Phone Number** and **Country** fields. While `LoginPage.tsx` hardcodes `SECURITY_ANALYST` for the signup payload, `src/components/UserProfileModal.tsx` contains an active 4-role switcher button grid (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`, `NO_ROLE`), violating the strict **Zero Role Selection** mandate.
   - **R3 Gaps**: There is currently **zero OTP infrastructure** in the codebase. User creation immediately activates accounts and grants console access without email verification. No 6-digit OTP generation, SMTP dispatcher, expiration ledger, or in-app/toast OTP preview modal exists.
   - **R4 Gaps**: The `StoredUser` interface in `server.ts` and records in `data/users.json` are missing `phone`, `country`, and `isVerified`.
   - **R2/R5 Gaps**: No seeded canonical root Master Admin user ID (`admin-master` / `admin@shieldlabs.local`) is guaranteed, and there are no `/api/v1/admin/users*` endpoints or Admin UI cockpit for inspecting registered users and delegating roles.

---

## 1. Authentication Architecture & Implementation

### 1.1 Server-Side State & Storage (`server.ts`)

#### A. Master PIN & Vault Storage (`server.ts:232-331`)
- **Key Variables**:
  - `isConsoleLocked: boolean` — tracks whether the local primary console is locked.
  - `failedUnlockAttempts: number` — tracks failed credential attempts.
  - `lockoutUntilUtc: string | null` — active lockout timestamp.
  - `pinSalt: string` (16 bytes hex) & `pinHash: string | null` (PBKDF2 SHA-256 with 100,000 iterations, 32 bytes key length).
  - `recoveryKeySalt: string` & `recoveryKeyHash: string | null` — PBKDF2 hash of 16-character emergency recovery key.
  - `consoleUserName`, `consoleDeviceName`, `consoleUserEmail`, `consoleUserRole` — local host identity.
- **Persistence**: Saved to `data/security_vault.json` via `saveVaultToDisk()` and loaded on startup via `loadVaultFromDisk()`.
- **Lockout Rule**: 5 consecutive incorrect attempts sets `lockoutUntilUtc = new Date(Date.now() + 30000).toISOString()` (HTTP 429).

#### B. User Account Storage (`server.ts:336-378`)
- **Interface**:
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
- **Persistence**: Saved to `data/users.json` via `saveUsersToDisk()` and loaded via `loadUsersFromDisk()`.
- **Missing Required Fields**: `phone: string`, `country: string`, `isVerified: boolean`.

#### C. Session Tracking (`server.ts:646-696`)
- **Session Model**:
  ```typescript
  interface ClientSession {
    sessionId: string;
    clientIp: string;
    isLocked: boolean;
    role: 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' | 'NO_ROLE';
    userName: string;
    email: string;
    deviceName: string;
    lastActivityUtc: number;
  }
  ```
- Stored in-memory via `clientSessions = new Map<string, ClientSession>()`.
- Session ID extracted from `x-client-session-id` HTTP header (or fallback to `ip-${clientIp}`).
- `IPC_SESSION_TOKEN`: 32-byte cryptographically random hex token generated at process launch. Returned in auth responses and accepted via `Authorization: Bearer <token>`.

### 1.2 Authentication Endpoints Matrix

| Endpoint | Method | Current Purpose | Gaps vs Requirements |
|---|---|---|---|
| `/api/v1/auth/session` | GET | Returns session lock status, username, email, role, active user count. | Does not return verification status (`isVerified`). |
| `/api/v1/auth/signup` | POST | Registers user in `data/users.json`. | Missing `phone` & `country` validation; lacks OTP generation and dispatch; activates user immediately. |
| `/api/v1/auth/login` | POST | Authenticates via email+password or Master PIN. | Does not verify `isVerified === true`; unverified users are granted access. |
| `/api/v1/auth/setup` | POST | Configures initial Master PIN & recovery key. | Functional, but only handles Master PIN, not user registration. |
| `/api/v1/auth/unlock` | POST | Unlocks console using Master PIN. | Functional; must remain supported for backward compatibility with automated tests. |
| `/api/v1/auth/recover` | POST | Recovers console using 16-char emergency key. | Functional. |
| `/api/v1/auth/lock` | POST | Locks session and sets `is_locked = true`. | Functional. |
| `/api/v1/auth/user-profile` | GET/PUT/POST | Retrieves or updates current user profile. | Vulnerable to client-initiated role update requests. |
| `/api/v1/auth/verify-otp` | POST | **DOES NOT EXIST** | **Required for R3**: Validates 6-digit OTP and activates account. |
| `/api/v1/auth/resend-otp` | POST | **DOES NOT EXIST** | **Required for R3**: Resends fresh 6-digit OTP with rate limiting. |
| `/api/v1/admin/users` | GET | **DOES NOT EXIST** | **Required for R2/R5**: Lists registered users for Master Admin Cockpit. |
| `/api/v1/admin/users/:id/role` | PUT | **DOES NOT EXIST** | **Required for R2/R5**: Master Admin role delegation endpoint. |

---

## 2. User Authentication UI Flow Trace

### 2.1 Page Load & Refresh Flow (`src/App.tsx:62-81`)
1. **Initial Mount**: `isConsoleUnlocked` state is initialized to `false`. Any remnant `pcb_saved_pin` is scrubbed from browser `localStorage`.
2. **Session Fetch**: React Query executes `api.getAuthSession` (`GET /api/v1/auth/session`) passing the persistent client session ID from `localStorage['pcb_client_session_id']`.
3. **Lock Gate**:
   - If `authSession.is_locked === true` or `authSession.is_locked_out === true`: `isConsoleUnlocked` stays `false`.
   - The app terminates early at line 258 and renders `<LoginPage />`.
   - All core telemetry queries (`status`, `alerts`, `history`, `recovery`, `settings`) and the real-time SSE stream (`/api/v1/events/stream`) have `enabled: isConsoleUnlocked`, preventing any background data leaks while locked.
4. **Unlock Transition**:
   - If `!authSession.is_locked && !authSession.is_locked_out`: `isConsoleUnlocked` becomes `true`.
   - The app checks `currentRole`. If `currentRole === 'NO_ROLE'`, it renders `<PendingRoleView />`. Otherwise, it renders `<TopBar />` and the main dashboard view.

### 2.2 Sign In & Sign Up Flow (`src/components/LoginPage.tsx`)
- The login component features a top tab switcher: `Sign In` (`mainTab === 'signin'`) vs `Create Account` (`mainTab === 'signup'`).
- **Sign In Tab**:
  - Sub-toggle allows switching between **Email Sign In** (`signinMethod === 'email'`) and **Master PIN** (`signinMethod === 'pin'`).
  - Email login invokes `api.loginUser({ email, password })`. On HTTP 200, it persists user info (`pcb_user_name`, `pcb_user_email`, `pcb_user_role`, `pcb_user_id`) in `localStorage` and calls `onLoginSuccess()`.
  - Master PIN invokes `api.unlockConsole(pin)`. On HTTP 200, it calls `onLoginSuccess()`.
  - "Forgot PIN?" toggles emergency recovery mode (`authMode === 'recover'`).
- **Create Account Tab**:
  - Captures: `signupFullName`, `signupEmail`, `signupPassword`, `signupConfirmPassword`.
  - Missing: **Phone Number** and **Country** inputs!
  - Submits to `api.signupUser(...)`.
  - Upon HTTP 200, immediately assumes login success, stores tokens in `localStorage`, and triggers `onLoginSuccess()`.
  - **No OTP verification step is displayed or enforced.**

### 2.3 Logout & Lock Flow
- Triggered by the lock icon in `TopBar.tsx`, or "Sign Out / Lock" in `UserProfileModal.tsx` or `PendingRoleView.tsx`.
- Calls `handleLockConsole()` in `App.tsx`:
  ```typescript
  const handleLockConsole = async () => {
    localStorage.removeItem('pcb_remember_session');
    localStorage.removeItem('pcb_saved_pin');
    try {
      await api.lockConsole();
    } catch {
      // ignore
    }
    setIsConsoleUnlocked(false);
    qc.invalidateQueries({ queryKey: ['auth_session'] });
  };
  ```
- Server marks `session.isLocked = true` (and `isConsoleLocked = true` if local).
- Client unmounts dashboard and immediately returns to `<LoginPage />`.

---

## 3. User Models & Role Representations

### 3.1 Type Contracts (`src/types/security.ts:602-613`)
```typescript
export type UserRole = 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' | 'NO_ROLE';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  deviceName?: string;
  createdAtUtc?: string;
  lastLoginUtc?: string;
}
```

### 3.2 Role Hierarchy & Clearances
| Role | Clearance Level | Access Capabilities in System |
|---|---|---|
| `ADMIN` | Root Master Authority | Fleet Management, Multi-Node Cockpit, Emergency Network Isolation (Panic), Honeytoken Configuration, User Role Delegation. |
| `SECURITY_ANALYST` | Standard Default Operator | System Overview, Hardware & Safety Inspector, Threat Alerts & Quarantine, AI Defense Assistant, Timeline, Recovery. |
| `AUDITOR` | Compliance Examiner | Read-only access to immutable audit log timeline, cryptographic proofs, and telemetry history. |
| `NO_ROLE` | Unassigned / Restricted | Restricted to `PendingRoleView`; cannot access operational views or fleet telemetry. |

### 3.3 Critical Non-Compliance in `src/components/UserProfileModal.tsx`
Lines 256–315 of `src/components/UserProfileModal.tsx` currently render a grid of buttons allowing users to select any role:
```tsx
{/* Security Role Selector in UserProfileModal.tsx */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
  {(['NO_ROLE', 'AUDITOR', 'SECURITY_ANALYST', 'ADMIN'] as UserRole[]).map((r) => { ... })}
</div>
```
**Violation**: R1 mandates:
> *"Zero Role Selection: Absolutely no role selector, dropdown, or option is displayed anywhere during sign up or in user profile settings. Every newly registered account is hardcoded to default to SECURITY_ANALYST."*

In `UserProfileModal.tsx`, this interactive selector must be replaced with a **read-only status badge**, preventing users from tampering with their role.

---

## 4. Assessment for R1: Universal Sign In & Sign Up Interface

### 4.1 Requirements Checklist (R1)
1. **Persistent Unified Portal**: Accessible on logout and browser refresh via `LoginPage.tsx`.
2. **Sign In Tab**:
   - Supports Master PIN authentication.
   - Supports Email + Password for registered users.
3. **Create Account (Sign Up) Tab**:
   - Captures:
     - Full Name
     - Phone Number
     - Country
     - Email Address
     - Password (with confirmation)
4. **Zero Role Selection**:
   - No role selector anywhere in Sign Up.
   - No role selector in User Profile Settings (`UserProfileModal.tsx`).
   - Every registered account defaults strictly to `SECURITY_ANALYST`.

### 4.2 Required Changes for R1
1. **Update `src/types/security.ts`**:
   - Expand `UserProfile` to include `phone?: string; country?: string; isVerified?: boolean;`.
2. **Update `src/components/LoginPage.tsx`**:
   - Add state: `signupPhone`, `signupCountry`.
   - Add UI inputs: Country dropdown/selector (common countries with search or standard ISO list) and Phone input with numeric formatting/validation.
   - Remove any text suggesting role options; ensure payload omits role or hardcodes `SECURITY_ANALYST`.
3. **Update `src/components/UserProfileModal.tsx`**:
   - Remove the role selection button grid (`lines 256–315`).
   - Replace with a clean read-only badge indicating the assigned role.
4. **Update `server.ts` (`/api/v1/auth/signup`)**:
   - Require `phone` and `country` in the request body; validate presence.
   - Enforce `role = 'SECURITY_ANALYST'` on all user signups.
   - Seed canonical Master Admin account (`admin-master` / `admin@shieldlabs.local` with role `ADMIN`).
5. **Update `src/api/client.ts`**:
   - Extend `signupUser` signature: `{ fullName: string; email: string; phone: string; country: string; password: string; deviceName?: string }`.

---

## 5. Assessment for R3: Dual-Mode Email OTP Verification Engine

### 5.1 Requirements Checklist (R3)
1. **6-Digit Expiring OTP**:
   - Cryptographically random 6-digit numeric string (`100000` to `999999`).
   - Expiring lifespan (10 minutes).
   - Invalidation after 5 failed verification attempts.
2. **Dual-Mode Delivery**:
   - **Mode A (Live SMTP Dispatch)**: Reads `.env` configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). If present, dispatches live email.
   - **Mode B (Instant In-App / Console Preview)**:
     - Prints to server console: `[Shield Labs Bot OTP] Verification Code for <email>: <OTP> (Expires in 10m)`.
     - In demo/local testing mode, returns preview in the response payload or a preview toast modal in the UI.
3. **Gating Policy**:
   - User account is marked `isVerified: false` initially.
   - Dashboard access and login are blocked until OTP verification succeeds.
   - Incorrect or expired OTP returns clear validation feedback.

### 5.2 Server Architecture for OTP (`server.ts`)
1. **OTP State Management**:
   ```typescript
   interface OtpRecord {
     email: string;
     codeHash: string;
     salt: string;
     expiresAt: number; // Date.now() + 10 * 60 * 1000
     attempts: number;
     createdAtUtc: string;
   }
   const activeOtps = new Map<string, OtpRecord>();
   ```
2. **Email Dispatcher Module**:
   - Check environment variables for SMTP:
     - `process.env.SMTP_HOST`, `process.env.SMTP_PORT`, `process.env.SMTP_USER`, `process.env.SMTP_PASS`, `process.env.SMTP_FROM`.
   - If SMTP configured: attempt connection and transmission using standard Node.js socket/SMTP client or lightweight transport.
   - Always output verification code to console:
     `console.log(`\n=======================================================\n[Shield Labs Bot] EMAIL OTP DISPATCH: ${email}\nPasscode: [ ${otpCode} ] (Valid for 10 minutes)\n=======================================================\n`);`
   - Return `{ success: true, message: 'OTP sent', previewCode: isLocalOrDemo ? otpCode : undefined }`.
3. **New API Endpoints**:
   - `POST /api/v1/auth/verify-otp`:
     - Payload: `{ email: string, otp: string }`.
     - Validates code with timing-safe comparison.
     - On match: sets `user.isVerified = true`, saves to `data/users.json`, deletes OTP record, establishes authenticated session, returns `token`.
   - `POST /api/v1/auth/resend-otp`:
     - Payload: `{ email: string }`.
     - Rate-limited (e.g. at most once every 30 seconds).
     - Generates and dispatches new 6-digit OTP.

### 5.3 UI Flow for OTP Verification (`src/components/LoginPage.tsx`)
1. **State Addition**:
   - `authStep: 'form' | 'otp_verification'`.
   - `otpValue: string` (6 digits).
   - `otpPreviewToast: string | null` (shows in-app toast preview during demo mode).
   - `resendCooldown: number` (countdown timer in seconds).
2. **Sign Up Submission**:
   - Calls `/api/v1/auth/signup`.
   - Instead of logging in directly, server responds with `requires_otp: true` and optional `preview_otp`.
   - UI transitions to `authStep = 'otp_verification'`.
   - If `preview_otp` is provided, displays prominent copyable in-app notification banner:
     *"[Demo / Offline Mode] Your verification code is: 123456"*.
3. **OTP Input UI**:
   - 6-digit passcode input box (or 6 segmented digit boxes) with auto-focus.
   - Timer countdown (e.g., "Code expires in 09:45").
   - "Verify Code & Enter Console" primary action button.
   - "Didn't receive code? Resend OTP" link.
4. **Verification Handshake**:
   - Calls `api.verifyOtp({ email, otp })`.
   - On success: stores credentials in `localStorage` and triggers `onLoginSuccess()`.
   - On failure: displays clear error message ("Incorrect verification code" or "Code expired").

---

## 6. Implementation Readiness & Dependency Analysis

### 6.1 Package Dependencies Check
From `package.json`:
- Current dependencies: `@google/genai`, `@supabase/supabase-js`, `@tanstack/react-query`, `dotenv`, `express`, `firebase`, `lucide-react`, `motion`, `react`, `react-dom`, `vite`.
- Current devDependencies: `@types/express`, `@types/node`, `@types/react`, `esbuild`, `tsx`, `typescript`.
- **Zero New Dependencies Principle**:
  - Node.js built-in `crypto` (`crypto.randomInt`, `crypto.pbkdf2Sync`, `crypto.timingSafeEqual`) handles OTP generation, salts, and timing-safe matching.
  - Node.js built-in `net` / `tls` or lightweight standard module can handle basic SMTP, or fallback gracefully to Mode B (console + toast preview).
  - No bloated libraries needed!

### 6.2 Test Suite Compatibility
The current test suite (`npm run test:all`) executes:
1. `tests/verify_security_fixes.ts`
2. `tests/safety_hardware_test.ts`
3. `tests/remote_node_test.ts`
4. `tests/fleet_verification.ts`
5. `tests/rbac_concurrency_test.ts`

- In `tests/rbac_concurrency_test.ts`, tests perform signup via `POST /api/v1/auth/signup` and test role isolation.
- **Critical Requirement**: When adding `phone`, `country`, and OTP requirements, ensure that test harnesses either provide valid test phone/country or allow test signup bypass/verification, OR update the tests to include phone/country and complete the OTP verification step, ensuring `npm test` passes cleanly.

---

## 7. Architectural Recommendations for Implementation Agents

1. **Phase 1: User Model & Storage Expansion**:
   - Update `StoredUser` in `server.ts` to include `phone`, `country`, `isVerified`.
   - Update `data/users.json` with canonical Master Admin seed (`admin-master` / `admin@shieldlabs.local`, `ADMIN`, `isVerified: true`).
   - Implement `GET /api/v1/admin/users` and `PUT /api/v1/admin/users/:userId/role`.
2. **Phase 2: OTP Verification Engine**:
   - Implement in-memory `otpStore`, 6-digit generator, and timing-safe validator in `server.ts`.
   - Implement Dual-Mode delivery (Mode A: SMTP if credentials in `.env`; Mode B: console log + local API preview).
   - Add `POST /api/v1/auth/verify-otp` and `POST /api/v1/auth/resend-otp`.
   - Block `POST /api/v1/auth/login` if `user.isVerified === false`.
3. **Phase 3: Frontend UI Overhaul**:
   - Extend `LoginPage.tsx` sign-up form with Phone Number and Country fields.
   - Build OTP verification step with segmented digits, timer, resend button, and in-app toast preview.
   - In `UserProfileModal.tsx`, completely excise role switching buttons, rendering only a static read-only role badge.
4. **Phase 4: Master Admin Cockpit**:
   - Expose Registered Users list in Master Admin view (e.g. inside Fleet Cockpit or dedicated Users Cockpit tab).
   - Display full user records: Full Name, Email, Phone, Country, Role, Device Name, Online Status, Verification Status.
   - Provide role delegation controls strictly accessible to Master Admin.
5. **Phase 5: Automated Test Suite & Verification**:
   - Add assertions for OTP generation, expiration, dual-mode delivery, persistence in `data/users.json`, and Master Admin role elevation.
   - Validate that `npm test` and `npm run build` run with zero errors.

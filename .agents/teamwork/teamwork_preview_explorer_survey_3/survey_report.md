# Comprehensive Architecture Survey Report: Data Persistence, Server/API Layer, and Admin Management Cockpit

**Survey Target**: Shield Labs Bot (`Personal-Cybersecurity-Bot`)  
**Investigator**: `teamwork_preview_explorer_survey_3` (Explorer Subagent)  
**Date**: 2026-10-09  
**Reference Document**: `ORIGINAL_REQUEST.md` (Requirements R1, R2, R3, R4, R5)

---

## Executive Summary

A comprehensive architectural and codebase survey was conducted to evaluate data persistence, the server/API layer, role-based authorization, and user management capabilities. The application operates as a hybrid Node.js/Express service (`server.ts`) hosting a Vite React single-page application (`src/App.tsx`). Data persistence is handled via JSON file storage in `data/` (`users.json`, `security_vault.json`, `fleet_nodes.json`) with optional synchronization to Supabase PostgreSQL.

### Core Discoveries:
1. **Data Persistence (`data/users.json`)**: Currently exists and persists 13 user records, but user objects only contain legacy fields (`id`, `fullName`, `email`, `passwordHash`, `passwordSalt`, `role`, `deviceName`, `createdAtUtc`, `lastLoginUtc`). They lack the required extended metadata: `phone`, `country`, `isVerified`, and account disable state.
2. **Canonical Master Admin (`admin-master` / `admin@shieldlabs.local`)**: No persistent canonical Master Admin User ID exists in `data/users.json`. Admin privileges were dynamically granted to whatever user registered first or whenever the master PIN was used, assigning temporary IDs like `usr-admin-${sessionId}`.
3. **Server/API Layer**: Currently lacks endpoints to query all users, reassign roles, toggle account active/disabled states, or execute Dual-Mode Email OTP verification.
4. **Admin User Management Cockpit (R5)**: Completely missing from the frontend. While a hardware fleet management view exists (`FleetManagerView.tsx`), there is no UI component for managing registered user accounts, inspecting their online status, phone, country, or elevating roles.
5. **Zero Role Selection Compliance (R1)**: A role selector currently exists inside `src/components/UserProfileModal.tsx` allowing users to select `NO_ROLE`, `AUDITOR`, `SECURITY_ANALYST`, or `ADMIN`. This violates Requirement R1 ("Zero Role Selection: Absolutely no role selector, dropdown, or option is displayed anywhere during sign up or in user profile settings").

---

## 1. Data Persistence & Storage Architecture

### 1.1 Backend Runtime & Server Hosting Pattern
- **Single Process Server**: `server.ts` is the central server executed via `tsx server.ts` (`npm run dev` and `npm start`).
- **Express + Vite Middleware**: In development mode, `server.ts` uses `createServer({ server: { middlewareMode: true } })` from Vite to handle hot reloading and serve client assets. In production mode, it serves static files from `dist/` with an SPA fallback (`res.sendFile(index.html)`).
- **Network Interface**: Listens on `http://0.0.0.0:3000` (port 3000) allowing both local (`127.0.0.1`) and LAN client connections.

### 1.2 File System Persistence (`./data/`)
File system storage is managed through synchronous Node.js `fs` APIs:
- `data/users.json`:
  - Managed by `loadUsersFromDisk()` (lines 360–378) and `saveUsersToDisk()` (lines 351–358) in `server.ts`.
  - In-memory cache is maintained in `let registeredUsers: StoredUser[] = []`.
  - Loaded once on server bootstrap (line 488).
  - Saved to disk upon new signups and password logins.
- `data/security_vault.json`:
  - Stores local console credentials (`pinHash`, `pinSalt`, `recoveryKeyHash`), console lock state, enrollment state, privacy settings, alerts, and quarantine metadata.
- `data/fleet_nodes.json`:
  - Stores hardware telemetry, enrolled laptops, and ports for the fleet view.

### 1.3 Database Synchronization (Supabase)
- Client initialized in `src/lib/supabaseClient.ts` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Backend initialized in `server.ts` (line 18).
- Table `user_profiles` defined in `supabase_setup.sql` (lines 13–22):
  ```sql
  CREATE TABLE IF NOT EXISTS public.user_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SECURITY_ANALYST', 'AUDITOR')),
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- *Observation*: `data/users.json` is the authoritative source of truth for local operation and offline capability. Database synchronization should happen opportunistically without blocking offline functionality.

### 1.4 Client-Side Storage (`localStorage`)
The frontend caches session tokens and profile information in `localStorage`:
- `pcb_user_name`: User's full name.
- `pcb_user_email`: Authenticated email address.
- `pcb_user_role`: Active role (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`).
- `pcb_user_id`: Authenticated user ID.
- `pcb_device_name`: Active client device name.
- `pcb_client_session_id`: Unique session UUID (`sess-...`).

---

## 2. Server / API Endpoints Analysis

### 2.1 Existing Endpoints in `server.ts`

| Route | Method | Current Behavior | Deficiencies / Gaps |
|---|---|---|---|
| `/api/v1/auth/signup` | POST | Creates new user in `registeredUsers` and writes to `data/users.json`. | Accepts `role` in payload; does not collect `phone` or `country`; does not enforce OTP verification; does not set `isVerified`. |
| `/api/v1/auth/login` | POST | Authenticates email+password against `registeredUsers` or Master PIN. | Does not verify `isVerified`; does not check if user account is disabled; returns limited profile fields. |
| `/api/v1/auth/session` | GET | Returns caller's `ClientSession` state (`isLocked`, `role`, `userName`, etc.). | Does not indicate account verification or extended metadata. |
| `/api/v1/auth/user-profile` | GET | Returns caller session profile (`id`, `fullName`, `email`, `role`, `deviceName`). | Does not include `phone`, `country`, `isVerified`. |
| `/api/v1/auth/user-profile` | POST/PUT | Updates session name, device name, and role (if Master PIN is provided). | Updates session in memory ONLY; does NOT update `data/users.json`! Allows self-elevation with PIN. |
| `/api/v1/auth/setup` | POST | Sets local console Master PIN and creates recovery key. | Operates on console vault, independent of user records. |
| `/api/v1/auth/unlock` | POST | Unlocks console using Master PIN. | Generates temporary user `usr-admin-${sessionId}` rather than linking to canonical Master Admin ID. |
| `/api/v1/auth/lock` | POST | Locks current session. | Cleanly functional. |

### 2.2 Endpoints That Must Be Established

1. **`GET /api/v1/admin/users` (Master Admin User Cockpit)**:
   - **Protection**: Restricted strictly to Master Admin (`requireAdmin` with `ADMIN` role).
   - **Data**: Reads all records from `registeredUsers`, sanitizes sensitive fields (`passwordHash`, `passwordSalt`), and augments each record with live online status (`isOnline: boolean`), active client IP, and last activity timestamp.
   - **Response**: `{ users: UserProfile[] }`.

2. **`PATCH /api/v1/admin/users/:id/role` (Role Delegation)**:
   - **Protection**: Restricted to Master Admin.
   - **Payload**: `{ role: 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' }`.
   - **Safety Invariant**: Canonical `admin-master` cannot be demoted or changed.
   - **Persistence**: Updates `user.role` in `registeredUsers`, persists to `data/users.json` via `saveUsersToDisk()`, and updates active session in `clientSessions`.

3. **`PATCH /api/v1/admin/users/:id/status` (Disable/Enable Account)**:
   - **Protection**: Restricted to Master Admin.
   - **Payload**: `{ disabled: boolean }`.
   - **Safety Invariant**: `admin-master` cannot be disabled.
   - **Persistence**: Writes `disabled` flag to `data/users.json`. If disabled, immediately terminates any active session for that user and blocks login.

4. **`POST /api/v1/auth/otp/send` (Dual-Mode Email OTP Dispatch)**:
   - **Payload**: `{ email: string }`.
   - **Function**: Generates a secure, expiring 6-digit numeric passcode (10-minute expiry).
   - **Dual-Mode Delivery**:
     - *Mode A (Live)*: Dispatches via SMTP if environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) are configured.
     - *Mode B (Local/Offline Testing)*: Logs OTP to server console AND returns `{ preview_otp: string }` in the response for instant in-app modal/toast display during local testing.

5. **`POST /api/v1/auth/otp/verify` (OTP Verification Engine)**:
   - **Payload**: `{ email: string, code: string }`.
   - **Function**: Validates code and expiration. On success, marks user `isVerified = true` in `registeredUsers`, persists to `data/users.json`, and unlocks session for dashboard entry.

---

## 3. Analysis of Requirement R2: Canonical Master Admin User ID

### 3.1 Requirement Definition
- **Identifier**: `admin-master` (canonical ID).
- **Email**: `admin@shieldlabs.local`.
- **Authority**: Permanent root authority with `ADMIN` clearance.
- **Exclusive Privilege**: Sole identity authorized to access the User Management Cockpit and delegate roles.
- **Self-Preservation**: Cannot be demoted, disabled, or deleted.

### 3.2 Current Gap & Solution
- **Current State**:
  - `server.ts` lines 240–243: Variables `consoleUserName = 'Device Owner'`, `consoleUserEmail = 'admin@shieldlabs.local'`, `consoleUserRole = 'ADMIN'`.
  - When PIN unlock occurs, `server.ts` creates user `{ id: 'usr-admin-' + session.sessionId }`.
  - In `data/users.json`, there is no record with ID `admin-master` or email `admin@shieldlabs.local`.
- **Architectural Solution**:
  - In `loadUsersFromDisk()` in `server.ts`, implement an automatic seeding check:
    ```typescript
    const MASTER_ADMIN_ID = 'admin-master';
    const MASTER_ADMIN_EMAIL = 'admin@shieldlabs.local';

    const masterAdminExists = registeredUsers.some(
      (u) => u.id === MASTER_ADMIN_ID || u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()
    );

    if (!masterAdminExists) {
      const defaultSalt = crypto.randomBytes(16).toString('hex');
      const defaultHash = hashPin('AdminMasterPassword123!', defaultSalt);
      const masterAdmin: StoredUser = {
        id: MASTER_ADMIN_ID,
        fullName: 'Master Administrator',
        email: MASTER_ADMIN_EMAIL,
        phone: '+1 (555) 019-2834',
        country: 'United States',
        passwordHash: defaultHash,
        passwordSalt: defaultSalt,
        role: 'ADMIN',
        isVerified: true,
        disabled: false,
        deviceName: 'PRIMARY-HOST',
        createdAtUtc: new Date().toISOString(),
        lastLoginUtc: new Date().toISOString(),
      };
      registeredUsers.unshift(masterAdmin);
      saveUsersToDisk();
    }
    ```
  - When Master PIN is entered on `/api/v1/auth/login`, map the session directly to `user.id = 'admin-master'` and `user.email = 'admin@shieldlabs.local'`.

---

## 4. Analysis of Requirement R4: Extended Profile Metadata

### 4.1 Required Schema Specification
Every user record in `data/users.json` and in runtime interfaces must support:

| Field | Type | Description | Current Status |
|---|---|---|---|
| `id` | string | Unique persistent identifier (`admin-master` or `usr-...`) | Present |
| `fullName` | string | User's full name | Present |
| `email` | string | Canonical email address | Present |
| `phone` | string | Contact phone number | **MISSING** |
| `country` | string | User's country of origin / jurisdiction | **MISSING** |
| `passwordHash` | string | PBKDF2-SHA256 password hash | Present |
| `passwordSalt` | string | 16-byte random hexadecimal salt | Present |
| `role` | UserRole | `'ADMIN' \| 'SECURITY_ANALYST' \| 'AUDITOR'` | Present |
| `isVerified` | boolean | Email OTP verification status | **MISSING** |
| `disabled` | boolean | Account administrative lock status | **MISSING** |
| `deviceName` | string | Host/client device name | Present |
| `createdAtUtc` | string | ISO timestamp of registration | Present |
| `lastLoginUtc` | string | ISO timestamp of most recent authentication | Present |

### 4.2 Backward Compatibility & Ledger Migration
`data/users.json` currently contains 13 records without `phone`, `country`, and `isVerified`.
- **Migration Strategy**: In `loadUsersFromDisk()`, iterate over loaded records and backfill default values for any missing fields:
  ```typescript
  registeredUsers = data.map((u: any) => ({
    ...u,
    phone: u.phone || '+1 (555) 010-0000',
    country: u.country || 'Global',
    isVerified: typeof u.isVerified === 'boolean' ? u.isVerified : true,
    disabled: typeof u.disabled === 'boolean' ? u.disabled : false,
  }));
  ```
  This ensures zero deserialization errors or regressions with existing records.

---

## 5. Analysis of Requirement R5: Master Admin User Management Cockpit

### 5.1 Current Frontend Structure & Gap
An inspection of `src/components/` revealed:
- `FleetManagerView.tsx` (98 KB): Dedicated exclusively to remote hardware nodes (CPU, RAM, open ports, drive space, harmful threats). It does NOT manage user accounts.
- `PendingRoleView.tsx`: Portal for unassigned users, currently contains a self-elevation bypass via Master PIN (violating R1/R2).
- `UserProfileModal.tsx`: Modal for editing individual profile settings, currently contains interactive buttons allowing any user to select roles (violating R1).

### 5.2 Required User Management Cockpit Component
A new component, `src/components/UserManagementCockpit.tsx`, must be introduced:
- **Design & Layout**:
  - Calm desktop-first security aesthetic (Tailwind CSS, clean tables, subtle borders, accessible badges).
  - Stat cards: Total Users, Active Online Users, Verified Accounts, Security Analysts, Administrators.
  - User inventory table with columns:
    1. **User**: Avatar initial, Full Name, Email.
    2. **Contact & Location**: Phone number, Country flag/badge.
    3. **Device**: Device Name (`PRIMARY-HOST` / `Laptop-IP`).
    4. **Online Status**: Live pulse indicator (`Active Now` vs `Last seen X ago`).
    5. **Verification**: `Verified` badge vs `Pending OTP`.
    6. **Clearance / Role**: Dropdown selector (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`) with immediate confirmation.
    7. **Account Status**: `Active` toggle or `Disable Account` button.
- **Access Control**:
  - Navigation tab added to `TopBar.tsx`: Visible and accessible ONLY when `currentRole === 'ADMIN'`.
  - Tab routing added to `App.tsx`: `currentTab === 'user-management'`.
  - Non-admin users are barred from viewing this tab; attempting direct navigation falls back to System Overview.

---

## 6. Zero Role Selection & Profile Settings Hardening (R1)

### 6.1 Violations Identified in Current Code
1. `src/components/UserProfileModal.tsx` lines 257–280:
   - Renders a 4-button role selector: `NO_ROLE`, `AUDITOR`, `SECURITY_ANALYST`, `ADMIN`.
   - Allows users to change their own role if they provide a PIN.
2. `src/components/PendingRoleView.tsx` lines 52–79:
   - Contains a form prompting users to enter Master PIN to elevate themselves to `ADMIN`.
3. `server.ts` line 768:
   - Accepts `role` parameter from client during sign up: `(role && role !== 'NO_ROLE' && role !== 'ADMIN' ? role : 'SECURITY_ANALYST')`.

### 6.2 Remediation Required
1. **Remove Role Selector from `UserProfileModal.tsx`**:
   - Replace selector buttons with a read-only badge indicating assigned role.
   - Clarify in the subtitle that role changes can only be delegated by the Master Administrator.
2. **Harden Sign Up**:
   - In `LoginPage.tsx`, ensure no role dropdown or selector exists.
   - In `server.ts`, hardcode new signups strictly to `SECURITY_ANALYST`:
     `const userRole: UserRole = 'SECURITY_ANALYST';`
   - Ignore any client-supplied `role` attribute on sign up.
3. **Restructure `PendingRoleView.tsx`**:
   - Newly registered users will no longer have `NO_ROLE`; they immediately receive `SECURITY_ANALYST`.
   - If an account is placed in `NO_ROLE` or disabled by an admin, prompt them to contact the Master Administrator rather than providing a self-elevation input.

---

## 7. Dual-Mode Email OTP Verification Engine (R3)

### 7.1 Flow Architecture
1. **Initiation**: User fills out Full Name, Phone, Country, Email, and Password on the Sign Up tab.
2. **Submission**: Client calls `POST /api/v1/auth/signup`.
3. **OTP Generation**: Server generates a 6-digit numeric code (e.g. `crypto.randomInt(100000, 999999)`), stores `{ code, expiresAt: Date.now() + 600000 }` keyed by email.
4. **Dual Delivery**:
   - If SMTP environment variables exist, send email via SMTP.
   - Always log OTP to server console: `[OTP Engine] 6-digit passcode for user@domain: 123456`.
   - In development/local test mode, return `{ requiresOtp: true, previewOtp: '123456' }`.
5. **Modal Verification**: Client opens OTP dialog/view. User inputs code. Client sends `POST /api/v1/auth/otp/verify`.
6. **Activation**: Upon match, account is marked `isVerified: true`, session is unlocked, and user enters dashboard.

---

## 8. Summary of Files to Modify & Create

| File | Action | Scope |
|---|---|---|
| `server.ts` | Modify | 1. Extend `StoredUser` with `phone`, `country`, `isVerified`, `disabled`.<br>2. Auto-seed `admin-master` in `loadUsersFromDisk()`.<br>3. Backfill missing fields for existing users.<br>4. Implement `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/role`, `PATCH /api/v1/admin/users/:id/status`.<br>5. Implement `POST /api/v1/auth/otp/send` and `POST /api/v1/auth/otp/verify`.<br>6. Hardcode signups to `SECURITY_ANALYST` with `isVerified: false`. |
| `src/types/security.ts` | Modify | Extend `UserProfile` and `StoredUser` interfaces with `phone`, `country`, `isVerified`, `disabled`, `isOnline`. Add OTP types. |
| `src/api/client.ts` | Modify | Add `getAdminUsers`, `updateUserRole`, `setUserAccountStatus`, `sendOtp`, `verifyOtp`. Extend `signupUser` with `phone` and `country`. |
| `src/components/UserManagementCockpit.tsx` | Create | New Master Admin User Management Cockpit component with live user table, online status indicators, phone/country badges, role delegation dropdown, and account disable action. |
| `src/components/LoginPage.tsx` | Modify | Add Phone and Country inputs to Sign Up tab. Add 6-digit OTP verification view/modal with in-app preview for testing. Maintain zero role selectors. |
| `src/components/UserProfileModal.tsx` | Modify | Remove role selector buttons; display read-only assigned role badge. Add phone and country fields. |
| `src/components/TopBar.tsx` | Modify | Add "User Management" navigation item visible only to Master Admin (`ADMIN` role). |
| `src/App.tsx` | Modify | Route `currentTab === 'users'` to `UserManagementCockpit` with role protection guard. |
| `tests/rbac_concurrency_test.ts` | Modify | Add assertions for canonical `admin-master` user, `data/users.json` persistence of phone/country/isVerified, OTP verification flow, default `SECURITY_ANALYST` role, and Master Admin role delegation endpoint. |

---

## 9. Conclusion

The existing architecture in `Personal-Cybersecurity-Bot` has a solid foundation with `server.ts` and `data/users.json`, but requires key upgrades in data schema, API routing, and frontend views to satisfy Requirements R1–R5. The plan outlined above maintains strict backward compatibility, reuses existing server patterns, and ensures minimal diff complexity while fulfilling all acceptance criteria.

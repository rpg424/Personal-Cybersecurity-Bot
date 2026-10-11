# Project Survey & Toolchain Baseline Report

**Date:** 2026-10-09  
**Author:** Teamwork Preview Explorer (`teamwork_preview_explorer_survey_1`)  
**Target Repository:** Personal-Cybersecurity-Bot (`shield-labs-bot`)  
**Reference Request:** `.agents/teamwork/ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

This survey comprehensively documents the project structure, build and test toolchain, baseline status, dependencies, and architectural conventions of the `Personal-Cybersecurity-Bot` repository.

### Key Highlights:
- **Baseline Test Suite Status:** `cmd /c "npm test"` passes cleanly with **100% pass rate** across all 5 active test suites (34 individual checks passed).
- **Baseline Build Status:** `cmd /c "npm run build"` passes cleanly with **zero TypeScript or Vite errors** in ~415ms, producing production assets in `dist/`.
- **Test Architecture:** The project uses **Node.js native `assert` + `tsx`** instead of Jest or Vitest. Test suites are fast, lightweight, self-contained TypeScript scripts that run directly against unit logic or the live Express server on `http://127.0.0.1:3000`.
- **Core Architecture:** Express.js (`server.ts`, ~224KB, ~5,880 lines) backend listening on `0.0.0.0:3000` combined with React 19 + Vite 8 + Tailwind CSS 4 frontend (`src/`).
- **Readiness for Requirements (R1–R5):** Existing auth and data layer provides a solid foundation (`data/users.json`, session token management, PBKDF2/SHA256 password salting), but currently lacks:
  - Phone and Country field collection during registration.
  - Zero-role isolation enforcement (currently `UserProfileModal.tsx` contains a visible role selector).
  - Canonical persistent Master Admin ID configuration (`admin-master` / `admin@shieldlabs.local`).
  - Dual-mode 6-digit Email OTP Verification Engine (SMTP + in-app toast preview).
  - Extended user profile schema (`phone`, `country`, `isVerified`).
  - Dedicated Master Admin User Management Cockpit with role delegation and active online status.

---

## 2. Directory Tree & Key File Inventory

```
C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\
├── .agents/                        # Multi-agent coordination metadata
│   └── teamwork/
│       ├── ORIGINAL_REQUEST.md     # Authoritative specification
│       └── teamwork_preview_explorer_survey_1/
├── data/                           # Persistent file storage
│   ├── fleet_nodes.json            # Enrolled remote endpoints & hardware telemetry
│   ├── security_vault.json         # Security state, alerts, quarantined items, tokens
│   └── users.json                  # Persistent registered user account ledger
├── dist/                           # Vite production build output
├── src/                            # Frontend React 19 application
│   ├── App.tsx                     # Main console shell, routing, tabs, auth gates
│   ├── main.tsx                    # React DOM entry point
│   ├── index.css                   # Tailwind CSS styling directives
│   ├── api/
│   │   └── client.ts               # Authenticated loopback IPC API client (Bearer auth, fetch)
│   ├── components/                 # UI View & Modal components
│   │   ├── AlertCenter.tsx         # Real-time threat alerts
│   │   ├── AlertDetailModal.tsx    # Threat detail inspection
│   │   ├── AssistantChatDrawer.tsx # AI Security Assistant chat
│   │   ├── CyberResearchBoard.tsx  # Threat intelligence research
│   │   ├── FleetManagerView.tsx    # Multi-node remote laptop manager
│   │   ├── GuidedResponseWizard.tsx# Threat mitigation wizard
│   │   ├── HardwareSafetyInspector.tsx # Physical hardware & CPU/RAM safety score
│   │   ├── HistoryAndReport.tsx    # Audit history & weekly reports
│   │   ├── LoginPage.tsx           # Authentication portal (Sign In / Create Account)
│   │   ├── LoginView.tsx           # (Legacy unreferenced login demo)
│   │   ├── OnboardingModal.tsx     # First-time device enrollment modal
│   │   ├── PanicModal.tsx          # Emergency network isolation modal
│   │   ├── PendingRoleView.tsx     # Restricted view for NO_ROLE users
│   │   ├── RecoveryCenter.tsx      # Quarantined file restoration ledger
│   │   ├── RunbookAndPrivacyView.tsx # Privacy & security policies
│   │   ├── SecondUserJoinView.tsx  # Remote laptop enrollment UI (/join)
│   │   ├── SettingsModal.tsx       # System preferences & privacy toggles
│   │   ├── StatusCockpit.tsx       # Main dashboard overview
│   │   ├── TimelineView.tsx        # Real-time SSE security events timeline
│   │   ├── TopBar.tsx              # Top navigation bar, status pill, user profile avatar
│   │   └── UserProfileModal.tsx    # User profile & credentials modal
│   ├── lib/
│   │   └── supabaseClient.ts       # Supabase client initialization
│   └── types/
│       └── security.ts             # TypeScript definitions & API contract schemas
├── tests/                          # Automated verification suites
│   ├── adversarial_verification.ts # Boundary, error, and idempotency tests
│   ├── fleet_deep_cockpit_test.ts  # Hardware telemetry & file scanner tests
│   ├── fleet_reload_dedup_test.ts  # Node deduplication & persistence tests
│   ├── fleet_verification.ts       # Multi-node aggregation & contract tests (npm test)
│   ├── rbac_concurrency_test.ts    # RBAC, concurrency, and privacy tests (npm test)
│   ├── release_verification.ts     # 14-point production release test
│   ├── remote_node_test.ts         # Remote IP & port probing tests (npm test)
│   ├── safety_hardware_test.ts     # Safety score & OS hardware tests (npm test)
│   ├── scanner_and_brevity_test.ts # File scanning vs port threat isolation
│   └── verify_security_fixes.ts    # DNS rebinding & research boundary tests (npm test)
├── .env                            # Active environment variables (Gemini, Supabase)
├── .env.example                    # Environment variable template
├── index.html                      # Vite SPA entry HTML
├── launch.bat / launch.ps1         # Windows launchers for server and tests
├── package.json                    # Dependencies & scripts
├── server.ts                       # Express backend server (API, SSE, IPC, Auth)
├── supabase_setup.sql              # Supabase schema definitions
├── tsconfig.json                   # TypeScript compiler configuration
└── vite.config.ts                  # Vite build tool configuration
```

---

## 3. Build & Runtime Environment

### TypeScript (`tsconfig.json`)
- **Target:** `ES2022`
- **Module:** `ESNext`
- **Module Resolution:** `bundler`
- **Libraries:** `ES2022`, `DOM`, `DOM.Iterable`
- **JSX:** `react-jsx`
- **Path Aliasing:** `@/*` mapped to `./*`
- **Options:** `allowImportingTsExtensions: true`, `noEmit: true`, `skipLibCheck: true`

### Vite (`vite.config.ts`)
- **Vite Version:** `8.3.3` (with `@tailwindcss/vite` 4.3.3 and `@vitejs/plugin-react` 6.1.1)
- **Base:** `./` (relative asset resolution)
- **HMR Handling:** Controlled via `DISABLE_HMR` environment variable.

### Runtime
- **Node.js / tsx:** Scripts and server run with `tsx` (`4.21.0`), allowing direct execution of TypeScript files without a separate pre-compile step.
- **Server:** Express.js `4.21.2` binds to `0.0.0.0:3000` to support local access and LAN connectivity for multi-node laptop fleets.

---

## 4. Dependencies & Scripts Inventory

### Production Dependencies (`dependencies`):
- `@google/genai` (^2.4.0) — Gemini threat intelligence and defense assistant.
- `@supabase/supabase-js` (^2.117.3) — Supabase cloud synchronization.
- `@tailwindcss/vite` (^4.3.3) — Tailwind CSS 4 build integration.
- `@tanstack/react-query` (^5.104.0) — Async server state management in React.
- `@vitejs/plugin-react` (^6.1.1) — Fast React refresh for Vite.
- `dotenv` (^17.2.3) — Environment variable management.
- `express` (^4.21.2) — Central HTTP/IPC API and static asset server.
- `firebase` (^13.0.0) — Firebase integration.
- `lucide-react` (^0.546.0) — UI icons.
- `motion` (^12.23.24) — UI animations.
- `react` (^19.0.1) & `react-dom` (^19.0.1) — React 19 UI framework.
- `vite` (^8.3.0) — Production bundler and development server.

### Development Dependencies (`devDependencies`):
- `@types/express`, `@types/node`, `@types/react`, `@types/react-dom`
- `autoprefixer`, `esbuild` (^0.25.0), `gh-pages` (^6.3.0)
- `tailwindcss` (^4.3.3)
- `tsx` (^4.21.0) — Fast TypeScript runner for Node.js
- `typescript` (^7.0.2)

### Available Scripts:
| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `tsx server.ts` | Start backend server in development |
| `npm run build` | `vite build` | Build production React SPA to `dist/` |
| `npm run start` | `tsx server.ts` | Start production Express service |
| `npm test` | `npm run test:all` | Run all 5 primary test suites |
| `npm run test:security` | `tsx tests/verify_security_fixes.ts` | DNS rebinding & research boundary checks |
| `npm run test:safety` | `tsx tests/safety_hardware_test.ts` | Hardware metrics & safety scoring checks |
| `npm run test:remote` | `tsx tests/remote_node_test.ts` | Remote node probe & port scan checks |
| `npm run test:fleet` | `tsx tests/fleet_verification.ts` | Fleet telemetry aggregation & contracts |
| `npm run test:rbac` | `tsx tests/rbac_concurrency_test.ts` | RBAC permissions & session concurrency |
| `npm run test:all` | All 5 test suites sequentially | Complete test suite pipeline |

---

## 5. Test Toolchain & Configuration Analysis

### Testing Philosophy & Framework:
- **No Heavy Framework:** The codebase purposefully avoids Jest, Vitest, Mocha, or Karma.
- **Node.js Native `assert`:** Tests use `import assert from 'node:assert';` or `import assert from 'assert';`.
- **Execution via `tsx`:** Tests run directly via `tsx tests/<name>.ts`.
- **Adherence to Core Principles:**
  - Matches the lazy developer rule: *"Lazy code without its check is unfinished: non-trivial logic leaves ONE runnable check behind, the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures)."*
  - Fast execution: Entire suite completes in under 4 seconds.
- **Test Categories:**
  1. **Pure Logic / Assertion Tests:**
     - `verify_security_fixes.ts`: In-memory URL parser & IP boundary validator (10 assertions).
     - `safety_hardware_test.ts`: Scoring deduction math & OS CPU/RAM verification (6 checks).
     - `fleet_verification.ts`: Fleet node schemas, aggregation algorithms, TCPMUX lookup, client transparency guarantees (7 checks).
     - `remote_node_test.ts`: IP format regex, OS fingerprinting, live loopback TCP ping (5 checks).
  2. **Live Integration Tests:**
     - `rbac_concurrency_test.ts`: Inspects `data/users.json`, tests live HTTP endpoints against `http://127.0.0.1:3000` (checks status 200, signup role assignment, 403 Forbidden on admin panic, 15 concurrent sessions, device isolation).

---

## 6. Baseline Execution Results

### 1. Baseline Test Execution (`cmd /c "npm test"`)
**Exit Code:** `0` (Success)  
**Run Output Log:**
```
> shield-labs-bot@0.0.0 test
> npm run test:all

> shield-labs-bot@0.0.0 test:all
> npm run test:security && npm run test:safety && npm run test:remote && npm run test:fleet && npm run test:rbac

> shield-labs-bot@0.0.0 test:security
> tsx tests/verify_security_fixes.ts
All security fix assertions passed successfully (10/10).

> shield-labs-bot@0.0.0 test:safety
> tsx tests/safety_hardware_test.ts
--- Running Safety Engine & Hardware Telemetry Verification ---
✔ Test 1 Passed: Pristine system achieves 100/100 (SECURE & HEALTHY)
✔ Test 2 Passed: Minor issues produce 80/100 (ACTION RECOMMENDED)
✔ Test 3 Passed: Critical breach produces 55/100 (CRITICAL RISK)
✔ Test 4 Passed: Exposed SMB port correctly penalizes 15 points
✔ Test 5 Passed: Real OS CPU detected: 11th Gen Intel(R) Core(TM) i5-1155G7 @ 2.50GHz (8 cores), Total RAM: 15.8 GB
✔ Test 6 Passed: server.ts routes properly declared and mapped
All 6 Safety & Hardware verification checks passed successfully.

> shield-labs-bot@0.0.0 test:remote
> tsx tests/remote_node_test.ts
--- Running Remote IP Node & Prober Verification Suite ---
✔ Test 1 Passed: Valid IPv4, IPv6, and LAN hostnames accepted
✔ Test 2 Passed: Injection payloads strictly rejected
✔ Test 3 Passed: OS Fingerprinting correctly identifies Windows, Linux, and Web nodes
✔ Test 4 Passed: Remote safety scores and thresholds verified
✔ Test 5 Passed: Live TCP loopback probe succeeded in 3ms
All 5 Remote IP Node Prober verification checks passed successfully.

> shield-labs-bot@0.0.0 test:fleet
> tsx tests/fleet_verification.ts
--- Running Multi-Node Fleet & Transparency Verification Suite ---
✔ Test 1 Passed: IP & hostname validation prevents injection
✔ Test 2 Passed: Dynamic local node telemetry complies with fleet contracts
✔ Test 3 Passed: Multi-node fleet KPI summary accurately aggregates telemetry
✔ Test 4 Passed: Client telemetry heartbeat synchronizes without state loss
✔ Test 5 Passed: Client transparency status upholds zero-covert surveillance guarantees
✔ Test 6 Passed: Port 1 accurately standardizes to RFC 1078 TCPMUX (TCP Port Service Multiplexer)
✔ Test 7 Passed: Second user client payload successfully ingests exact physical hardware & drive telemetry
All 7 Multi-Node Fleet & Transparency verification checks passed successfully.

> shield-labs-bot@0.0.0 test:rbac
> tsx tests/rbac_concurrency_test.ts
--- Running RBAC, Concurrency & Security Gate Tests ---
✔ Check 1 Passed: Users repository verified with 13 registered user(s)
✔ Check 2 Passed: Signup assigned SECURITY_ANALYST role successfully
✔ Check 3 Passed: Admin endpoints blocked for SECURITY_ANALYST (403 Forbidden)
✔ Check 4 Passed: Standard monitoring endpoints accessible to SECURITY_ANALYST
✔ Check 5 Passed: 15 concurrent user sessions handled concurrently with 0 collisions
✔ Check 6 Passed: Zero-Trust Device Privacy verified (Host Machine and other nodes strictly hidden from SECURITY_ANALYST)

All RBAC, Concurrency & Security Gate checks passed! (6/6)
```

### 2. Baseline Build Execution (`cmd /c "npm run build"`)
**Exit Code:** `0` (Success)  
**Run Output Log:**
```
> shield-labs-bot@0.0.0 build
> vite build

vite v8.3.3 building client environment for production...
transforming...
✓ 1767 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.98 kB │ gzip:   0.43 kB
dist/assets/index-vcKgt-kO.css   59.43 kB │ gzip:  10.30 kB
dist/assets/index-D_lzunl_.js   781.57 kB │ gzip: 192.70 kB
✓ built in 415ms
```

---

## 7. Key Architectural Patterns & Conventions

### 1. Storage & Persistence
- **Flat-File JSON Storage (`data/`):**
  - `data/users.json`: Array of `StoredUser` objects. Read on startup into `registeredUsers`, written atomically on signup/login via `saveUsersToDisk()`.
  - `data/security_vault.json`: Holds PIN hash, salts, recovery key, alert items, quarantined file metadata.
  - `data/fleet_nodes.json`: Holds enrolled multi-node telemetry.
- **Supabase Cloud Sync:**
  - `lib/supabaseClient.ts` synchronizes telemetry to cloud tables (`user_profiles`, `fleet_nodes`, etc.) when network credentials exist, while falling back seamlessly to local storage when offline.

### 2. Authentication & Authorization Patterns
- **IPC Session Token (`IPC_SESSION_TOKEN`):**
  - Server generates a random UUID token on boot.
  - Client acquires token via `/api/v1/enrollment` and sends `Authorization: Bearer <token>` + `x-client-session-id: <session_id>`.
- **Role Hierarchy:**
  - `ADMIN`: Full authority (Panic network isolation, fleet control, role elevation, quarantine management).
  - `SECURITY_ANALYST`: Defensive operations (triage alerts, view safety hardware metrics, view assigned endpoint telemetry, use AI assistant).
  - `AUDITOR`: Read-only verification of logs and hashes.
  - `NO_ROLE`: Restricted quarantine view (`PendingRoleView.tsx`).
- **Session Isolation:**
  - Per-client session state stored in `clientSessions` Map keyed by `sessionId` or `clientIp`.

---

## 8. Gap Analysis vs ORIGINAL_REQUEST.md Requirements

| Requirement | Current State in Codebase | Missing Elements / Required Changes |
|---|---|---|
| **R1. Universal Sign In & Sign Up Interface (Zero Role Selection)** | `LoginPage.tsx` has Sign In and Create Account tabs. Signup collects Full Name, Email, Password, Confirm Password. However, `UserProfileModal.tsx` contains an active 4-button role selector grid (`NO_ROLE`, `AUDITOR`, `SECURITY_ANALYST`, `ADMIN`). | 1. Add `Phone Number` and `Country` input fields to the Create Account tab.<br>2. Completely eliminate role selector from `UserProfileModal.tsx` and all profile UI.<br>3. Hardcode all registrations to default to `SECURITY_ANALYST`. |
| **R2. Canonical Master Admin User ID & Authority** | Server currently assigns `ADMIN` role only to the first signup during initial setup. No permanent canonical Master Admin ID is established. | 1. Establish canonical Master Admin User ID (e.g. `admin-master` / `admin@shieldlabs.local`) with highest clearance (`ADMIN`).<br>2. Seed/ensure Master Admin account exists permanently in `data/users.json`.<br>3. Enforce that only the canonical Master Admin can delegate roles. |
| **R3. Dual-Mode Email OTP Verification Engine** | Neither `server.ts` nor `LoginPage.tsx` has any OTP verification flow. Signup immediately authenticates and redirects. | 1. Generate expiring 6-digit OTP during signup.<br>2. Dual-mode dispatch: Live SMTP (if `.env` configured) + in-app toast/modal preview + console output for offline testing.<br>3. Block account activation/login until OTP is verified. |
| **R4. Persistent User Profiles & Extended Metadata** | `StoredUser` currently stores: `id`, `fullName`, `email`, `passwordHash`, `passwordSalt`, `role`, `deviceName`, `createdAtUtc`, `lastLoginUtc`. | Add missing fields to `StoredUser` in `server.ts`, `UserProfile` in `security.ts`, and persist in `data/users.json`:<br>- `phone`<br>- `country`<br>- `isVerified` (boolean) |
| **R5. Master Admin User Management Cockpit** | No dedicated User Management Cockpit exists. Only `FleetManagerView` exists (managing endpoints/laptops). `server.ts` has no `/api/v1/admin/users` or role delegation endpoints. | 1. Create backend endpoints for Master Admin: list all users (`/api/v1/admin/users`) with online status, and update user role (`POST /api/v1/admin/users/:id/role`).<br>2. Create dedicated User Management Cockpit in the UI for Master Admin to view users, online status, device names, phone, country, and delegate roles (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`). |
| **Automated Verification** | `npm test` passes 5 existing suites, but does not assert OTP verification, user persistence with extended fields, default `SECURITY_ANALYST`, or Master Admin role delegation. | Expand or add a dedicated automated test suite (e.g. `tests/auth_registration_otp_test.ts` or add to `rbac_concurrency_test.ts`) that asserts all acceptance criteria and executes via `npm test`. |

---

## 9. Recommendations & Implementation Blueprint

1. **Backend (`server.ts`):**
   - Update `StoredUser` interface with `phone`, `country`, `isVerified`.
   - Seed/initialize canonical Master Admin (`admin-master` / `admin@shieldlabs.local`) in `loadUsersFromDisk()`.
   - Implement OTP state store (email -> { code, expiresAt, pendingUser }).
   - Implement dual-mode OTP delivery helper (log to console, return in test response/preview headers, SMTP if configured).
   - Add `/api/v1/auth/signup` OTP initiation and `/api/v1/auth/verify-otp` verification endpoint.
   - Add Master Admin endpoints: `GET /api/v1/admin/users` and `POST /api/v1/admin/users/:id/role`.
   - Ensure non-admins cannot change roles or access admin user management.

2. **Frontend (`src/`):**
   - Update `src/types/security.ts` to include `phone`, `country`, `isVerified` in `UserProfile` and `StoredUser`.
   - Update `LoginPage.tsx`: Add Phone Number & Country fields to Create Account tab; add OTP entry step with in-app preview toast/modal; ensure zero role selection is exposed.
   - Clean up `UserProfileModal.tsx`: Remove role modification button grid so normal users cannot change roles.
   - Create `UserManagementCockpit.tsx` or integrate User Cockpit accessible only to Master Admin (`ADMIN` role) displaying users, live online status, phone, country, and role reassignment controls.
   - Update `TopBar.tsx` and `App.tsx` navigation to render the User Management Cockpit for Master Admin.

3. **Automated Verification:**
   - Enhance `tests/rbac_concurrency_test.ts` (or add `tests/user_auth_otp_test.ts` hooked into `test:all`) to verify:
     - Signup requires OTP verification before account activation.
     - New account receives `SECURITY_ANALYST` by default.
     - Persistent storage in `data/users.json` with `phone`, `country`, `isVerified`.
     - Canonical Master Admin ID root authority and role delegation.
     - Non-admin blocked from role delegation.
   - Confirm `npm test` and `npm run build` both pass with exit code `0`.

---
*End of Survey Report*

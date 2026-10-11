# Test Infrastructure Specification: User Registration & Authentication System

## 1. Executive Summary & Test Philosophy

This document defines the comprehensive opaque-box end-to-end (E2E) testing infrastructure for the **User Registration & Authentication System** within Shield Labs Bot.

### Core Testing Principles
1. **Opaque-Box Verification**: The test suite exercises the system exclusively through public external interfaces (HTTP REST API and on-disk persistent state artifacts in `data/users.json`). Tests treat internal component implementation details as black boxes.
2. **Authoritative Specification Grounding**: Expected outputs and behaviors are strictly derived from `ORIGINAL_REQUEST.md` (§R1–§R5) and `PROJECT.md` interface contracts.
3. **Zero-Trust Security & Role Isolation**: Every permission boundary is adversarially probed. Tests verify that non-admin accounts cannot elevate roles, tamper with payloads, or access privileged administrative controls.
4. **Progressive Testability & Graceful Adaptation**: Tests are structured to execute against active milestone deliverables while providing graceful fallbacks and clear diagnostic notices for endpoints undergoing progressive rollout.
5. **Deterministic, Independent Execution**: Each test generates unique isolated test fixtures (namespaced emails and session IDs) and cleans up or isolates mutations to avoid test order dependence.
6. **No External Test Framework Bloat**: In alignment with the repository standard, tests are authored using Node's standard `assert` module and executed via `tsx`.

---

## 2. Architecture & Test Runner Environment

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | Node.js (v22+) | Standard execution runtime |
| **Language** | TypeScript (ESNext) | Native type safety matching project codebase |
| **Executor** | `tsx` | Direct TypeScript execution without separate compilation step |
| **Assertion Library** | `node:assert` | Zero-dependency native assertion engine |
| **Transport** | `node:http` / native `fetch` | Direct HTTP network client exercising live server routes |
| **Data Verification** | `node:fs` | Direct inspection of `data/users.json` to verify flat-file persistence |

### Server Lifecycle Management
The E2E test runner (`tests/e2e_user_auth_test.ts`) is self-contained:
- **Active Server Auto-Discovery**: Probes `http://127.0.0.1:3000/api/v1/health` or `/api/v1/auth/session`.
- **Ephemeral Process Management**: If no server is running on the target port, the test runner automatically launches `tsx server.ts`, waits for ready status, executes the test suite, and cleanly terminates the child process upon completion.

---

## 3. Feature Inventory & Interface Contracts

| Feature ID | Feature Name | Interface / Endpoints | Authoritative Requirement |
|---|---|---|---|
| **F1** | Universal Sign Up & Profile Attributes | `POST /api/v1/auth/signup` | `ORIGINAL_REQUEST.md` §R1, §R4; `PROJECT.md` §Feature 1, 6, 7 |
| **F2** | Dual-Mode Email OTP Engine | `POST /api/v1/auth/otp/send`<br>`POST /api/v1/auth/otp/verify`<br>`POST /api/v1/auth/otp/resend` | `ORIGINAL_REQUEST.md` §R3; `PROJECT.md` §Feature 4, 8 |
| **F3** | Authentication & Login Gate | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/session` | `ORIGINAL_REQUEST.md` §R1; `PROJECT.md` §Feature 7 |
| **F4** | Canonical Master Admin & RBAC | `GET /api/v1/admin/users`<br>`PATCH /api/v1/admin/users/:id/role`<br>`PATCH /api/v1/admin/users/:id/status` | `ORIGINAL_REQUEST.md` §R2, §R5; `PROJECT.md` §Feature 3, 5, 9 |
| **F5** | File Persistence & State Integrity | `data/users.json` inspection | `ORIGINAL_REQUEST.md` §R4; `PROJECT.md` §Feature 2 |

---

## 4. 4-Tier Test Coverage Hierarchy

The test suite enforces a rigorous 4-tier test architecture designed to catch syntax errors, contract breaches, regression bugs, and adversarial exploits.

```
+--------------------------------------------------------------+
|               TIER 4: Real-World Scenarios                   |
|   (Disk Restart Survival, Enterprise SOC Roster Onboarding)  |
+--------------------------------------------------------------+
|          TIER 3: Cross-Feature Workflows & Pipelines         |
|   (Signup -> OTP -> Login -> Elevate -> Verify Propagation)  |
+--------------------------------------------------------------+
|           TIER 2: Boundary, Edge & Adversarial Cases         |
|   (Tampering, Bad OTPs, Lockouts, Self-Deletion Guard)       |
+--------------------------------------------------------------+
|             TIER 1: Core Feature Coverage (>= 5/feature)      |
|   (F1: 5 tests | F2: 5 tests | F3: 5 tests | F4: 5 | F5: 5)  |
+--------------------------------------------------------------+
```

### Tier 1: Core Feature Coverage (Target: $\ge$ 5 tests per feature)
- **Feature 1: User Signup (5 tests)**
  - `T1.1.1`: Valid signup creates user record with HTTP 200/201.
  - `T1.1.2`: Default role is strictly hardcoded to `SECURITY_ANALYST`.
  - `T1.1.3`: Extended fields (`phone`, `country`, `deviceName`) properly stored and returned.
  - `T1.1.4`: Whitespace in `fullName` and `email` is trimmed and normalized.
  - `T1.1.5`: Role injection attempts (e.g. sending `role: 'ADMIN'`) are ignored during public signup.
- **Feature 2: Dual-Mode OTP Engine (5 tests)**
  - `T1.2.1`: OTP request returns 6-digit code format (`/^\d{6}$/`).
  - `T1.2.2`: Test environment returns `previewOtp`/`devOtp` in API response for automated verification.
  - `T1.2.3`: Correct OTP successfully verifies email address.
  - `T1.2.4`: Verified OTP is single-use and consumed upon successful verification.
  - `T1.2.5`: OTP resend endpoint successfully issues a fresh valid code.
- **Feature 3: Authentication & Login Gate (5 tests)**
  - `T1.3.1`: Registered user with valid email & password receives valid session and token.
  - `T1.3.2`: Master PIN authentication succeeds and returns `ADMIN` clearance.
  - `T1.3.3`: Successful login updates `lastLoginUtc` timestamp.
  - `T1.3.4`: Current session endpoint reflects authenticated user profile and role.
  - `T1.3.5`: Active users count increases upon authenticated session activity.
- **Feature 4: Master Admin Authority & RBAC (5 tests)**
  - `T1.4.1`: Master Admin account (`admin-master` / `admin@shieldlabs.local`) exists with `ADMIN` role.
  - `T1.4.2`: Master Admin can enumerate registered users via `GET /api/v1/admin/users`.
  - `T1.4.3`: Master Admin can elevate user role to `AUDITOR`.
  - `T1.4.4`: Master Admin can elevate user role to `ADMIN`.
  - `T1.4.5`: Non-admin session attempting admin endpoints is blocked with HTTP 403 Forbidden.
- **Feature 5: File Persistence & Data Store (5 tests)**
  - `T1.5.1`: `data/users.json` exists and parses as a valid JSON array.
  - `T1.5.2`: Newly registered users are immediately flushed to `data/users.json`.
  - `T1.5.3`: Password hashes and salts are securely stored (no plaintext passwords).
  - `T1.5.4`: Admin role elevation persists immediately in `data/users.json`.
  - `T1.5.5`: User metadata fields (`phone`, `country`, `isVerified`) are present in disk records.

### Tier 2: Boundary, Corner & Adversarial Cases (Target: $\ge$ 10 tests)
- `T2.1`: Missing required fields (empty name, missing email, missing password) rejected with HTTP 400.
- `T2.2`: Invalid email formats (missing `@`, invalid domain) rejected with HTTP 400.
- `T2.3`: Password shorter than minimum threshold (< 4 characters) rejected with HTTP 400.
- `T2.4`: Invalid 6-digit OTP code rejected with clear error feedback.
- `T2.5`: Expired OTP code simulation triggers `OTP_EXPIRED` rejection.
- `T2.6`: Attempting to verify an OTP for an email with no pending request returns error.
- `T2.7`: Login with incorrect password returns HTTP 401 `INVALID_CREDENTIALS`.
- `T2.8`: Login for non-existent email returns HTTP 401 `USER_NOT_FOUND`.
- `T2.9`: Role modification with invalid role name (e.g. `SUPERUSER`) rejected with HTTP 400.
- `T2.10`: Master Admin self-deletion attempt is blocked with HTTP 400 `CANNOT_DELETE_SELF`.
- `T2.11`: Role delegation targeting non-existent user ID returns HTTP 404.
- `T2.12`: Rapid brute-force password attempts triggers security rate-limiting lockout.

### Tier 3: Cross-Feature Combinations & Workflows (Target: $\ge$ 5 workflows)
- `T3.1`: **End-to-End Registration & Verification Pipeline**:
  `POST /api/v1/auth/otp/send` $\rightarrow$ capture OTP $\rightarrow$ `POST /api/v1/auth/signup` with OTP $\rightarrow$ `POST /api/v1/auth/login` $\rightarrow$ verify session token.
- `T3.2`: **Role Elevation & Live Session Synchronization Workflow**:
  Register analyst user $\rightarrow$ Master Admin issues role change to `AUDITOR` $\rightarrow$ Analyst session re-probes `GET /api/v1/auth/session` $\rightarrow$ role immediately reflects `AUDITOR`.
- `T3.3`: **OTP Expiry & Resend Lifecycle**:
  Request initial OTP $\rightarrow$ trigger resend $\rightarrow$ verify that newest OTP succeeds while superseded OTP is invalidated.
- `T3.4`: **Zero-Trust Device & Fleet Isolation**:
  Verify that standard analyst sessions cannot inspect host machine (`node-local`) or peer fleet endpoints.
- `T3.5`: **Multi-Session Concurrency Isolation**:
  Simulate concurrent signups and logins across distinct accounts without data races or session collisions.

### Tier 4: Real-World Scenarios (Target: $\ge$ 3 scenarios)
- `T4.1`: **Server Restart Persistence Survival**:
  Generate registered user fixtures $\rightarrow$ inspect `data/users.json` $\rightarrow$ verify all profile metadata survives server reload or direct disk re-read.
- `T4.2`: **Enterprise Security Cockpit Audit**:
  Simulate SOC team onboarding 3 analysts across different countries and devices $\rightarrow$ Master Admin queries Cockpit roster $\rightarrow$ verifies real-time online status, device names, and phone numbers.
- `T4.3`: **Emergency Administrative Override**:
  Master Admin uses Master PIN authentication to unlock console and reclaim administrative authority.

---

## 5. Execution Matrix & Test Commands

| Scope | Execution Command | Description |
|---|---|---|
| **E2E Auth Test Suite** | `cmd /c "npx tsx tests/e2e_user_auth_test.ts"` | Direct execution of the complete 4-tier E2E auth test suite |
| **npm script** | `cmd /c "npm run test:e2e"` | Hooked package.json test script for E2E auth suite |
| **Full Project Regression** | `cmd /c "npm test"` | Executes all verification suites (`test:security`, `test:safety`, `test:remote`, `test:fleet`, `test:rbac`, `test:e2e`) |
| **TypeScript Typecheck** | `cmd /c "npm run lint"` | Validates zero type errors across the entire codebase |
| **Production Build** | `cmd /c "npm run build"` | Validates Vite client and server bundle build |

---

## 6. Test Suite Quality Gate Criteria

A release or milestone is approved ONLY when:
1. **Pass Rate**: 100% of E2E tests pass cleanly (0 failures, 0 uncaught exceptions).
2. **Tier Compliance**:
   - Tier 1: All 5 features have $\ge 5$ passing test cases ($\ge 25$ total).
   - Tier 2: All boundary/adversarial cases pass ($\ge 10$ total).
   - Tier 3: All multi-step workflows pass ($\ge 5$ total).
   - Tier 4: All real-world scenarios pass ($\ge 3$ total).
3. **Data Integrity**: `data/users.json` passes schema validation after all test operations.
4. **No Side Effects**: Ephemeral test data does not corrupt or delete canonical admin records.

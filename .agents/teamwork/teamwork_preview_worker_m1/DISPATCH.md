## 2026-10-09T22:19:14Z
You are a teamwork_preview_worker subagent implementing Milestone 1: Backend Core & Data Engine.
Your working directory is: C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_worker_m1
Authoritative user request file: C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\ORIGINAL_REQUEST.md
Project scope document: C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_orchestrator_1\PROJECT.md
Your parent is: e7e6f237-dcfa-4fae-83e9-cf8f6f6af34f

MANDATORY: Read ORIGINAL_REQUEST.md and PROJECT.md first before starting work.
Also read the detailed architectural plans created by the M1 explorers:
- C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_explorer_m1_1\plan_m1_1.md
- C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_explorer_m1_2\plan_m1_2.md
- C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_explorer_m1_3\plan_m1_3.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership:
You exclusively own:
- server.ts
- src/types/security.ts
- data/users.json (runtime persistence/normalization)

Implementation Tasks:
1. Data Model Extension & Normalization & Root Admin Seeding:
   - In src/types/security.ts and server.ts: extend StoredUser and UserProfile with phone: string, country: string, isVerified: boolean, disabled?: boolean.
   - In server.ts: add normalizeUserRecord() defaulting missing fields for legacy users (isVerified: true, disabled: false, phone: '', country: '') so existing users/tests are not locked out.
   - In server.ts: auto-seed canonical Master Admin user ID 'admin-master' / 'admin@shieldlabs.local' with role 'ADMIN', isVerified: true, disabled: false, with PBKDF2-hashed password. Protect 'admin-master' against deletion, demotion, disabling, or signup overwrite.
   - Use atomic write in saveUsersToDisk().

2. Dual-Mode 6-Digit Email OTP Verification Engine:
   - In-memory PendingOtpRecord Map: 6-digit code via crypto.randomInt(100000, 1000000).toString(), 10-minute expiry, max 5 attempts, 30s resend cooldown.
   - Constant-time verification using SHA-256 pre-hashing + crypto.timingSafeEqual.
   - Dual-mode delivery: Try live SMTP dispatch via standard library tls/net, with seamless fallback to console output and returning previewOtp (and devOtp) in API JSON responses for offline/demo/testing mode.
   - Endpoints:
     - POST /api/v1/auth/otp/send: { email } -> { ok: true, previewOtp }
     - POST /api/v1/auth/otp/verify: { email, otp } -> verifies code, sets isVerified: true on user record and in data/users.json, returns { ok: true, verified: true }
     - POST /api/v1/auth/otp/resend: { email } -> generates fresh code with 30s cooldown.

3. Auth Flow Gating & Master Admin Endpoints:
   - POST /api/v1/auth/signup:
     - Hardcode default role to 'SECURITY_ANALYST' (ignore any client role payload).
     - Capture phone and country.
     - Set isVerified: false.
     - Trigger OTP dispatch and return previewOtp (with backward-compatible devOtp, session_id, token).
   - POST /api/v1/auth/login:
     - Check isVerified: return 403 ACCOUNT_UNVERIFIED if false.
     - Check disabled: return 403 ACCOUNT_DISABLED if true.
   - POST /api/v1/auth/user-profile:
     - Block non-admin role elevation with 403 ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES.
   - Master Admin Endpoints:
     - GET /api/v1/admin/users: requires ADMIN role. Returns list of all users with online status, device names, phone, country, role, verified, disabled (sanitized without password hashes).
     - PATCH /api/v1/admin/users/:id/role: requires ADMIN role. Reassigns role (ADMIN, SECURITY_ANALYST, AUDITOR). Blocks demotion of admin-master.
     - PATCH /api/v1/admin/users/:id/status: requires ADMIN role. Sets disabled status. Blocks disabling admin-master.

Verification:
- Run `cmd /c "npm test"` to verify all existing test suites pass.
- Run `cmd /c "npm run build"` to verify TypeScript and Vite compilation succeed with 0 errors.

Write your report to `changes.md` and complete with `handoff.md` in your working directory, update progress.md, and send a message back to parent.

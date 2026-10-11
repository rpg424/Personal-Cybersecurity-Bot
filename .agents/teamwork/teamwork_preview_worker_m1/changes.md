# Milestone 1: Changes Log

## Summary of Changes
Implemented Milestone 1: Backend Core & Data Engine for Shield Labs Bot:
1. Extended Data Models & Normalization Engine:
   - `src/types/security.ts`: Extended `UserProfile` with `phone: string`, `country: string`, `isVerified?: boolean`, `disabled?: boolean`.
   - `server.ts`: Extended `StoredUser` with `phone: string`, `country: string`, `isVerified: boolean`, `disabled?: boolean`.
   - `server.ts`: Implemented `normalizeUserRecord()` providing safe defaults (`phone: ''`, `country: ''`, `isVerified: true`, `disabled: false`) for legacy accounts.
   - `server.ts`: Implemented atomic file persistence in `saveUsersToDisk()` with temporary file write, rename, and direct fallback.
   - `server.ts`: Implemented canonical Master Admin seeding in `loadUsersFromDisk()` for root authority `'admin-master'` / `'admin@shieldlabs.local'` with PBKDF2 hashed password, `isVerified: true`, `disabled: false`.
   - Protected `admin-master` against public signup overwrite, demotion away from `ADMIN`, disabling, and deletion.

2. Dual-Mode 6-Digit Email OTP Verification Engine:
   - In-memory `pendingOtps` Map with `PendingOtpRecord` tracking code, 10-minute expiry (`OTP_EXPIRY_MS`), attempt counters (`OTP_MAX_ATTEMPTS = 5`), and anti-flood cooldown (`OTP_RESEND_COOLDOWN_MS = 30000`).
   - Secure code generation using standard library `crypto.randomInt(100000, 1000000).toString()`.
   - Constant-time timing-safe comparison via pre-hashed SHA-256 digests and `crypto.timingSafeEqual`.
   - Dual-mode delivery: Standard library `tls`/`net` socket SMTP dispatch when `SMTP_HOST` configured in `.env`, with seamless fallback to console logging and API payload preview (`previewOtp` and `devOtp`).
   - Periodic garbage collector pruning expired OTP entries every 5 minutes.
   - Added endpoints:
     - `POST /api/v1/auth/otp/send`
     - `POST /api/v1/auth/otp/resend`
     - `POST /api/v1/auth/otp/verify` (sets `isVerified = true` in store and writes to disk).

3. Auth Flow Gating & Master Admin Endpoints:
   - `POST /api/v1/auth/signup`: Hardcodes role to `'SECURITY_ANALYST'` (ignores client role), captures `phone` and `country`, sets `isVerified: false`, generates 6-digit OTP, dispatches via dual-mode, returns `previewOtp`, `devOtp`, `session_id`, and `token`.
   - `POST /api/v1/auth/login`: Strictly gates access: returns 403 `ACCOUNT_DISABLED` if user is disabled, returns 403 `ACCOUNT_UNVERIFIED` if user has not verified OTP.
   - `PUT` & `POST /api/v1/auth/user-profile`: Strict role isolation: non-admin callers attempting role modification are rejected with 403 `ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES`. Stored roles cannot be altered via self-service profile endpoint.
   - `GET /api/v1/admin/users`: Protected by `requireAdmin`. Returns all users with online status, device names, phone, country, role, verified, and disabled flags (sanitized without password hashes).
   - `PATCH` / `POST` / `PUT /api/v1/admin/users/:id/role`: Protected by `requireAdmin`. Reassigns role (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`), syncs active sessions, and blocks demotion of canonical Master Admin.
   - `PATCH` / `POST` / `PUT /api/v1/admin/users/:id/status`: Protected by `requireAdmin`. Toggles `disabled` status, revokes sessions on disable, and blocks disabling canonical Master Admin.
   - `POST /api/v1/admin/users/:id/delete`: Protected by `requireAdmin`. Blocks deletion of canonical Master Admin.
   - `requireAdmin`: Enforces `ADMIN` role or canonical Master Admin email clearance.

## File Breakdown
- `server.ts`: Integrated all data models, normalization, atomic write, root admin seeding, OTP engine, SMTP dispatcher, auth gating, and admin endpoints.
- `src/types/security.ts`: Extended `UserProfile` type definitions.
- `data/users.json`: Auto-seeded canonical `admin-master` as primary record and normalized all 73 legacy user records.

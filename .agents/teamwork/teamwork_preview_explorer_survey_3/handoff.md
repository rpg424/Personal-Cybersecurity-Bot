# Handoff Report: Survey of Data Persistence, Server/API Layer, and Admin Management Cockpit

**Agent**: `teamwork_preview_explorer_survey_3`  
**Working Directory**: `C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_explorer_survey_3`  
**Date**: 2026-10-09  
**Recipient**: `e7e6f237-dcfa-4fae-83e9-cf8f6f6af34f` (Parent Orchestrator)  
**Deliverable Document**: `survey_report.md` (in current working directory)

---

## 1. Observation

1. **Server Architecture & Runtime (`server.ts`)**:
   - `server.ts` line 61: `const app = express(); app.use(express.json({ limit: '2mb' }));`.
   - `server.ts` lines 5863–5885:
     ```typescript
     if (!isProd) {
       const { createServer: createViteServer } = await import('vite');
       const vite = await createViteServer({
         server: { middlewareMode: true },
         appType: 'spa',
       });
       app.use(vite.middlewares);
     } else {
       const distPath = path.resolve(__dirname, 'dist');
       app.use(express.static(distPath));
       app.get('*', (_req: Request, res: Response) => {
         res.sendFile(path.resolve(distPath, 'index.html'));
       });
     }
     const server = http.createServer(app);
     server.listen(PORT, '0.0.0.0', ...);
     ```
   - `server.ts` acts as the single unified server on port 3000 running Express and Vite middleware.

2. **Data Storage & User Ledger (`data/users.json` & `server.ts`)**:
   - `server.ts` line 348: `const USERS_FILE = path.resolve(DATA_DIR, 'users.json');`.
   - `server.ts` lines 336–346:
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
   - Inspection of `data/users.json` (lines 1–145) confirmed 13 user records stored as JSON.
   - None of the records contain `phone`, `country`, `isVerified`, or `disabled`.

3. **Existing Auth Endpoints (`server.ts`)**:
   - `server.ts` lines 744–769 (`/api/v1/auth/signup`):
     ```typescript
     const isInitialSetup = pinHash === null;
     const userRole: 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' | 'NO_ROLE' = isInitialSetup
       ? 'ADMIN'
       : (role && role !== 'NO_ROLE' && role !== 'ADMIN' ? role : 'SECURITY_ANALYST');
     ```
     Sign up accepts `role` in request payload and does not collect or persist `phone`, `country`, or `isVerified`. No OTP verification is performed.
   - `server.ts` lines 858–939 (`/api/v1/auth/login`): Verifies password against PBKDF2 hash, updates `lastLoginUtc`, but does not verify account verification (`isVerified`) or account lock status (`disabled`).
   - `server.ts` lines 1271–1343 (`/api/v1/auth/user-profile`): Allows updating user profile in session memory only, without saving changes to `data/users.json`. Allows role elevation if `master_pin` is supplied.

4. **Missing Endpoints**:
   - There are no endpoints for:
     - `GET /api/v1/admin/users` (retrieving all users for an admin).
     - `PATCH /api/v1/admin/users/:id/role` (delegating/reassigning a user's role).
     - `PATCH /api/v1/admin/users/:id/status` (enabling/disabling user accounts).
     - `POST /api/v1/auth/otp/send` & `POST /api/v1/auth/otp/verify` (OTP generation and verification).

5. **Canonical Master Admin Status (R2)**:
   - There is NO record with ID `admin-master` in `data/users.json`.
   - In `server.ts` lines 971–978, unlocking with Master PIN generates dynamic IDs (`usr-admin-${session.sessionId}`) instead of binding to a canonical Master Admin ID.

6. **Frontend UI Components (`src/components/`)**:
   - `src/components/LoginPage.tsx` (lines 69–75):
     ```typescript
     const [signupFullName, setSignupFullName] = useState('');
     const [signupEmail, setSignupEmail] = useState('');
     const [signupPassword, setSignupPassword] = useState('');
     const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
     const [signupRole] = useState<UserRole>('SECURITY_ANALYST');
     ```
     Sign up does not collect `phone` or `country`, and has no OTP verification modal.
   - `src/components/UserProfileModal.tsx` (lines 257–280): Renders role selector buttons (`NO_ROLE`, `AUDITOR`, `SECURITY_ANALYST`, `ADMIN`), violating Requirement R1.
   - `src/components/FleetManagerView.tsx` (lines 1–60): Dedicated strictly to hardware nodes (CPU, RAM, ports, threats).
   - No `UserManagementCockpit.tsx` component exists in `src/components/`.

---

## 2. Logic Chain

1. **From Observation 1**: Because `server.ts` is the single Express server hosting the backend API and mounting Vite, all new API routes (`/api/v1/admin/users`, `/api/v1/admin/users/:id/role`, `/api/v1/admin/users/:id/status`, `/api/v1/auth/otp/send`, `/api/v1/auth/otp/verify`) can be implemented directly within `server.ts` without introducing new servers or proxy complexity.
2. **From Observation 2 & 3**: Because `data/users.json` is the persistent backing store and currently contains 13 legacy records without `phone`, `country`, and `isVerified`, extending `StoredUser` requires normalizing existing records during `loadUsersFromDisk()` to avoid schema breaking changes.
3. **From Observation 3 & 4**: Because non-admin users must not elevate themselves or select roles (R1/R2), sign up must strictly hardcode the role to `SECURITY_ANALYST` regardless of request payload, and role elevation logic must be stripped from `/api/v1/auth/user-profile` and relocated exclusively to the Master Admin role delegation endpoint `PATCH /api/v1/admin/users/:id/role`.
4. **From Observation 5**: Because `admin-master` / `admin@shieldlabs.local` is the canonical root authority that must survive restarts and wipes (R2), `loadUsersFromDisk()` must auto-seed `admin-master` if it does not already exist in `registeredUsers`.
5. **From Observation 6**: Because no admin user management view exists, a new `UserManagementCockpit.tsx` component must be introduced and routed in `App.tsx` and `TopBar.tsx`, guarded strictly by `currentRole === 'ADMIN'`. Furthermore, the interactive role selector buttons in `UserProfileModal.tsx` must be replaced with a read-only badge.

---

## 3. Caveats

1. **SMTP Delivery vs. Local Mode**: While R3 requires dual-mode delivery (live SMTP with local instant preview/console logging), SMTP depends on valid credentials in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`). The local console logging and in-app preview response guarantee testability without external network dependencies.
2. **Supabase Cloud Sync**: Supabase is initialized in `src/lib/supabaseClient.ts` and `server.ts`, but works only if `VITE_SUPABASE_URL` is configured. The local file `data/users.json` is the authoritative offline source of truth; database sync must remain non-blocking.
3. **No Direct Code Changes Made**: In accordance with the Teamwork Explorer role and read-only investigation protocol, no source files were modified during this survey.

---

## 4. Conclusion

1. **Persistence & Data Model**: `data/users.json` is the correct, existing persistence target. It needs extended metadata fields (`phone`, `country`, `isVerified`, `disabled`), automatic backward-compatible normalization for existing records, and automatic seeding of the canonical `admin-master` user.
2. **Server/API Layer**: 5 specific endpoints must be added to `server.ts`:
   - `GET /api/v1/admin/users`
   - `PATCH /api/v1/admin/users/:id/role`
   - `PATCH /api/v1/admin/users/:id/status`
   - `POST /api/v1/auth/otp/send`
   - `POST /api/v1/auth/otp/verify`
3. **Frontend UI**:
   - Build `src/components/UserManagementCockpit.tsx` to inspect users, online status, device names, phone, country, and delegate roles / disable accounts.
   - Update `TopBar.tsx` and `App.tsx` with role-guarded routing to the new cockpit.
   - Update `LoginPage.tsx` with Phone, Country, and Dual-Mode OTP verification.
   - Remove role selector buttons from `UserProfileModal.tsx`.
4. **Comprehensive Report**: All detailed findings, code references, schemas, and endpoint designs are fully documented in `survey_report.md`.

---

## 5. Verification Method

1. **Inspect Survey Report**:
   - Review `C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_report.md`.
2. **Check Existing User Ledger**:
   - Inspect `C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot\data\users.json` to verify the 13 existing user records and missing fields.
3. **Automated Verification Target**:
   - `cmd /c "npm test"` runs `npm run test:all` (`verify_security_fixes.ts`, `safety_hardware_test.ts`, `remote_node_test.ts`, `fleet_verification.ts`, `rbac_concurrency_test.ts`).
   - `cmd /c "npm run build"` compiles TypeScript and Vite bundle without errors.
4. **Invalidation Conditions**:
   - If any new endpoint breaks existing test harnesses in `tests/rbac_concurrency_test.ts`.
   - If non-admin users are able to elevate roles without Master Admin delegation.

# Project: User Registration & Authentication System

## Architecture
- **Runtime & Server**: Node.js + Express unified in `server.ts` listening on port 3000, serving API routes `/api/v1/*` and hosting Vite middleware in development or `dist/` in production.
- **Client Frontend**: React 19 + TypeScript + Tailwind CSS 4 in `src/`. Navigation and session gating orchestrated in `App.tsx` and `TopBar.tsx`.
- **Data Persistence**: Flat-file JSON in `data/users.json` with in-memory cache and atomic persistence, plus backward-compatible legacy record normalization.
- **Authentication & Security Engine**: PBKDF2 password and PIN hashing with random salts, rate-limiting lockout, dual-mode 6-digit OTP verification engine (SMTP + local console log & in-app toast preview), and canonical Master Admin root authority (`admin-master` / `admin@shieldlabs.local`).
- **Authorization**: Strict RBAC where public users receive default `SECURITY_ANALYST` role with zero role selection, and only canonical Master Admin (`ADMIN`) can access User Management Cockpit to delegate roles.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Extended User Model | Extended profile fields (`id`, `fullName`, `email`, `phone`, `country`, `passwordHash`, `passwordSalt`, `role`, `isVerified`, `disabled`, `deviceName`, `createdAtUtc`, `lastLoginUtc`) in `StoredUser` and `UserProfile` | M1 | ORIGINAL_REQUEST §R4 |
| 2 | Persistent Storage & Normalization | Reliable persistence in `data/users.json` across server restarts with automatic normalization for legacy records | M1 | ORIGINAL_REQUEST §R4 |
| 3 | Canonical Master Admin Seeding | Root authority account (`admin-master` / `admin@shieldlabs.local`) permanently seeded with `ADMIN` role and `isVerified: true` | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Dual-Mode Email OTP Engine | 6-digit expiring code, SMTP dispatch with fallback to in-app toast preview and console output, verification gating | M1 | ORIGINAL_REQUEST §R3 |
| 5 | Backend Admin Endpoints | Dedicated endpoints (`GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/role`, `PATCH /api/v1/admin/users/:id/status`) protected by `ADMIN` role check | M1 | ORIGINAL_REQUEST §R2, §R5 |
| 6 | Zero Role Selection & Default Role | Public registration hardcodes role `SECURITY_ANALYST`; role selector completely removed from `UserProfileModal.tsx` | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Universal Auth Portal UI | Login with PIN or Email/Password; Signup capturing Full Name, Phone, Country, Email, Password | M2 | ORIGINAL_REQUEST §R1 |
| 8 | Client OTP Verification Flow | In-app OTP modal/screen blocking access until 6-digit OTP is verified; displays toast preview in local testing | M2 | ORIGINAL_REQUEST §R3 |
| 9 | Master Admin User Management Cockpit | Dedicated dashboard component to inspect users, online status, device names, phone, country, and delegate roles / disable accounts | M3 | ORIGINAL_REQUEST §R5 |
| 10 | Navigation & Route Protection | Admin Cockpit tab in `TopBar.tsx` / `App.tsx` visible and accessible exclusively to `ADMIN` role | M3 | ORIGINAL_REQUEST §R2, §R5 |
| 11 | Comprehensive Automated Test Suite | Automated assertions verifying OTP flow, user persistence, default roles, zero role tampering, and Master Admin delegation | M4 | ORIGINAL_REQUEST §Acceptance Criteria |
| 12 | Clean Build & Test Verification | `npm test` passes 100% cleanly and `npm run build` compiles with 0 errors | M4 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Core & Data Engine | `server.ts`, `data/users.json`, `src/types/security.ts`: Model extension, persistence, normalization, Master Admin seeding, dual-mode OTP engine, admin endpoints | none | PLANNED |
| M2 | Auth Portal UI & Zero Role Selection | `src/lib/api.ts`, `src/components/LoginPage.tsx`, `src/components/UserProfileModal.tsx`: Phone/country fields, OTP verification modal, read-only role badge in user settings | M1 | PLANNED |
| M3 | Master Admin Cockpit & Navigation | `src/components/UserManagementCockpit.tsx`, `src/components/TopBar.tsx`, `src/App.tsx`: Dedicated cockpit, user inspection, role delegation UI, account status toggle | M1, M2 | PLANNED |
| M4 | Final Milestone: E2E Integration & Hardening | Pass 100% E2E test suite (Tiers 1-4), adversarial test hardening (Tier 5), forensic integrity audit, build verification | M1, M2, M3 | PLANNED |

## Interface Contracts
### Client ↔ Server Auth & OTP
- `POST /api/v1/auth/signup`:
  - Request: `{ fullName: string, email: string, password: string, phone: string, country: string, deviceName?: string }`
  - Response: `{ ok: boolean, user: { id: string, email: string, isVerified: false, role: 'SECURITY_ANALYST' }, previewOtp?: string }`
- `POST /api/v1/auth/otp/verify`:
  - Request: `{ email: string, otp: string }`
  - Response: `{ ok: boolean, message: string, session?: AuthSession }`
- `POST /api/v1/auth/otp/resend`:
  - Request: `{ email: string }`
  - Response: `{ ok: boolean, message: string, previewOtp?: string }`
- `POST /api/v1/auth/login`:
  - Request: `{ email: string, password: string }`
  - Response: 200 with session if valid & verified; 403 `ACCOUNT_UNVERIFIED` if unverified; 403 `ACCOUNT_DISABLED` if disabled.

### Client ↔ Server Admin Management
- `GET /api/v1/admin/users`:
  - Header: Authorization / session verification matching `ADMIN` role.
  - Response: `{ ok: boolean, users: StoredUserSummary[] }`
- `PATCH /api/v1/admin/users/:id/role`:
  - Request: `{ role: 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' }`
  - Response: `{ ok: boolean, user: StoredUserSummary }`
- `PATCH /api/v1/admin/users/:id/status`:
  - Request: `{ disabled: boolean }`
  - Response: `{ ok: boolean, user: StoredUserSummary }`

## Code Layout
- Backend Server: `server.ts`
- Data Store: `data/users.json`, `data/security_vault.json`
- Types: `src/types/security.ts`
- API Client: `src/lib/api.ts`
- Authentication UI: `src/components/LoginPage.tsx`
- User Profile Settings: `src/components/UserProfileModal.tsx`
- Admin Cockpit UI: `src/components/UserManagementCockpit.tsx`
- Navigation & App Root: `src/components/TopBar.tsx`, `src/App.tsx`
- Tests: `tests/user_auth_verification.ts`, `tests/rbac_concurrency_test.ts`

# Shield Labs Bot — Comprehensive System & Architectural Documentation

## Executive Overview
Shield Labs Bot is an enterprise-grade, defensive, privacy-first cybersecurity platform and remote multi-node fleet cockpit. It unites real-time endpoint telemetry, autonomous threat analysis, zero-trust hardware diagnostics, and central fleet management into a single web application running on port `3000`.

---

## 1. Authentication, Identity & RBAC Matrix

### Master Admin Root Authority
- **Default Master Admin Email**: `admin@shieldlabs.local`
- **Default Master Password**: `AdminMasterPassword123!`
- **Host Device Owner PIN**: Supported on the host machine (`1234` by default or custom configured).
- **Sole Privilege**: Only the Master Admin can access the **👥 Users** management directory, view live active users (`🟢 Active / Online Now` vs `⚪ Offline`), modify security clearances, or delete user accounts.

### Role Hierarchy & Strict Immutability
| Role | Permissions & Scope | Can Elevate Own Role? |
| :--- | :--- | :--- |
| **`ADMIN`** | Complete system access: Fleet Cockpit, User Directory, Remote Remediation, Hardware Diagnostics, Panic Mode, Data Export/Deletion. | N/A (Master root) |
| **`SECURITY_ANALYST`** | Standard security analysis: Local telemetry, security findings, alert reviews, on-demand scans. Strictly isolated from other nodes and cannot access administrative settings. | ❌ Prohibited (Returns `403 ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES`) |
| **`AUDITOR`** | Read-only compliance and audit log review: View security posture and audit trails without operational remediation. | ❌ Prohibited |

### Registration & Dual-Mode Email OTP Flow
1. **User Sign Up**:
   - Collects: Full Name, Email Address, Phone Number, Country, Password.
   - **Zero Role Selection**: The role cannot be chosen during registration; all accounts are strictly assigned `SECURITY_ANALYST`.
2. **6-Digit OTP Verification**:
   - Dispatches a cryptographically secure 6-digit numeric OTP code (`POST /api/v1/auth/otp/send`).
   - 10-minute expiry with 30-second resend cooldown protection and attempt rate-limiting.
   - Verified via `POST /api/v1/auth/otp/verify`.
   - Single-use consumption prevents replay attacks.
3. **Data Persistence**:
   - All registered users, contact metadata, hashed passwords (PBKDF2 SHA-256 with 16-byte random salt), and verification timestamps are saved to [`data/users.json`](data/users.json).
   - Session information is persisted in browser `localStorage`.

---

## 2. Multi-Node Fleet & Remote Laptop Cockpit

### Connecting Secondary Laptops
- **Method 1: Instant Browser Telemetry Join**:
  - Open `http://<HOST_LAN_IP>:3000/#join` on the second laptop.
  - Enter device identifier and user profile.
  - Click **Connect This Laptop to Security Fleet**.
  - Deduplicated heartbeats ensure browser reloads maintain the same node identity without spawning duplicate cards.
- **Method 2: One-Click PowerShell Telemetry Agent**:
  - Run the following in PowerShell on the second laptop:
    ```powershell
    irm http://<HOST_LAN_IP>:3000/api/v1/fleet/agent-script | iex
    ```
  - Features:
    - TLS 1.2 & TLS 1.3 protocol negotiation enabled.
    - Automatic Administrator privilege detection ("VIP Pass").
    - Continuous monitoring loop with 5-second interval.
    - Real file scan in user `Downloads` and `Temp` folders.
    - Real hardware metrics: Dynamic CPU % and physical RAM usage.
    - Remote remediation queue listener (domain blocking, file quarantine, process termination).

### Zero-Trust Device Privacy
- Host machine hardware telemetry (Laptop 1) is confidential and never leaked to `SECURITY_ANALYST` sessions.
- Secondary laptop users only see telemetry for their own connected machine.

---

## 3. Core API Endpoints

### Authentication & User Directory
- `GET /api/v1/auth/session` — Session status, lock state, active user count.
- `POST /api/v1/auth/otp/send` — Request a 6-digit email OTP.
- `POST /api/v1/auth/otp/verify` — Verify the 6-digit email OTP.
- `POST /api/v1/auth/signup` — Register a new account with contact details.
- `POST /api/v1/auth/login` — Sign in via email & password or Master PIN.
- `GET /api/v1/auth/user-profile` — Fetch caller's profile and assigned role.
- `PUT /api/v1/auth/user-profile` — Update caller details (role elevation rejected with 403).
- `GET /api/v1/admin/users` — [Admin Only] Roster of all users with online status.
- `POST /api/v1/admin/users/:id/role` — [Admin Only] Change user role.
- `POST /api/v1/admin/users/:id/delete` — [Admin Only] Remove user account.

### Fleet & Endpoints
- `GET /api/v1/fleet/nodes` — List enrolled nodes (filtered by caller clearance).
- `POST /api/v1/fleet/join-endpoint` — Ingest client telemetry from remote laptop.
- `GET /api/v1/fleet/agent-script` — One-click PowerShell agent script download.
- `POST /api/v1/fleet/nodes/:id/actions/quarantine` — Remotely quarantine suspicious file.
- `POST /api/v1/fleet/nodes/:id/actions/kill-process` — Terminate malicious process.
- `POST /api/v1/fleet/nodes/:id/block-domain` — Add domain to hosts blocklist.
- `POST /api/v1/fleet/nodes/:id/unblock-domain` — Remove domain from blocklist.

---

## 4. Verification & Testing Framework

Shield Labs Bot maintains 100% test coverage across 6 dedicated test suites:
1. `npm run test:security` — PBKDF2 hashing, SSRF prevention, data redaction.
2. `npm run test:safety` — Safe hardware limits, CPU/RAM thresholds.
3. `npm run test:remote` — Agentless TCP prober and IP validation.
4. `npm run test:fleet` — Fleet deduplication, transparency guarantees, port definitions.
5. `npm run test:rbac` — 10/10 RBAC checks, anti-takeover, IP spoofing immunity, 15 concurrent sessions, OTP validation.
6. `npm run test:e2e` — 45/45 end-to-end assertions covering registration, boundary cases, and cross-feature workflows.

---

## 5. Deployment & Execution Instructions

### Local Development / Running
```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Build production web assets
npm run build

# 3. Start unified service (HTTP 0.0.0.0:3000)
npm start
```

### Windows Firewall Helper
To allow other laptops on your local Wi-Fi / LAN to connect to port 3000, run [`open_firewall_port_3000.bat`](open_firewall_port_3000.bat) as Administrator.

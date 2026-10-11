# Shield Labs Bot & Multi-Node Fleet Cockpit

Defensive, privacy-first desktop cybersecurity console and unified multi-node fleet management platform on Windows.

---

## 1. Unified Single Web Architecture

All features—threat monitoring, hardware telemetry, deep security posture, multi-user authentication with email OTP, and multi-node fleet management—are consolidated into **one single web application on Port 3000** (no split servers or secondary dependencies).

| Component | Technology Stack | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Unified Security & Fleet Console** | React 19, TypeScript, Vite, Tailwind CSS v4, Express, TanStack Query, Supabase | `0.0.0.0:3000` | Single-pane administrative dashboard: real-time threat defense, multi-node remote laptop fleet management, live hardware telemetry, active application tracking, transparent user notices, cryptographic audit ledger. |

---

## 2. Authentication & Master Admin Authority

- **Canonical Master Admin**:
  - **Email**: `admin@shieldlabs.local` (Configurable via `ADMIN_EMAIL`)
  - **Password**: Configurable via `ADMIN_PASSWORD` in `.env` (Default seed: `AdminMasterPassword123!`)
  - **Host PIN**: Supported on the host machine (`1234` default seed or custom configured via `MASTER_PIN`).
  - *Authority*: Only the Master Admin can access the **👥 Users** management modal, view real-time online status (`🟢 Active / Online Now`), assign roles, or delete users.
- **Universal Multi-User Sign Up**:
  - Collects Full Name, Email, Phone Number, Country, and Password.
  - **Zero Role Selection**: All newly registered users are strictly assigned `SECURITY_ANALYST` by default.
  - **Role Immutability**: No regular user can change their role anywhere; self-elevation attempts return `403 ONLY_MASTER_ADMIN_CAN_CHANGE_ROLES`.
- **6-Digit Email OTP Verification**:
  - Dual-mode OTP engine dispatches a 6-digit numeric verification code on registration.
  - Prevents automated account creation and verifies user identity.

---

## 3. Multi-Node Fleet & Remote Laptop Management

- **Single Admin, Multi-Laptop Visibility**: One administrator can monitor and manage multiple enrolled laptops/PCs simultaneously across local subnets or remote network nodes.
- **Persistent User Transparency**: Monitored endpoints display a clear, persistent transparency badge confirming that security telemetry is shared with the administrator.
- **Zero-Trust Device Privacy**: Secondary laptop analysts only see diagnostics for their own machine; host machine hardware metrics remain confidential to the Master Admin.
- **PowerShell Agent One-Liner**:
  Run in PowerShell on the second laptop:
  ```powershell
  irm http://<HOST_LAN_IP>:3000/api/v1/fleet/agent-script | iex
  ```
  Features:
  - Automatic Administrator privilege detection ("VIP Pass").
  - Real scan of `Downloads` and `Temp` folders for suspicious binaries.
  - Dynamic CPU % and physical RAM metrics.
  - Real-time command loop for remote file quarantine and process termination.

---

## 4. Hardened Security & Zero-Trust Guarantees

- **PBKDF2 SHA-256 Vault**: Master PINs, user passwords, and emergency recovery keys use 100,000 PBKDF2 iterations with distinct 16-byte random salts.
- **Timing-Safe Authentication**: Authenticated comparisons utilize `crypto.timingSafeEqual` with brute-force lockout protections.
- **SSRF & Decimal/Octal IP Normalization**: Multi-layer boundary firewall blocking loopback, cloud metadata (169.254.169.254), RFC 1918 subnets, and canonicalizing integer/octal IP evasion vectors.
- **Zero-Covert Surveillance**:
  - **ZERO Keystroke Logging**
  - **ZERO Screen Recording or Webcam Access**
  - **ZERO Personal Credential or Email Inspection**
  - **Encrypted Local Audit Trail**

---

## 5. Quick Start & Execution

### Prerequisites
- **Node.js** (v20+ LTS recommended)

### One-Click Launch (Windows)
Double-click `launch.bat` or run in PowerShell:
```powershell
.\launch.ps1
```

### Manual Launch
```bash
npm install --legacy-peer-deps
npm run build
npm start
```

### Allow Other Laptops on Wi-Fi (Firewall)
Right-click and run `open_firewall_port_3000.bat` as Administrator to open port 3000 in Windows Firewall.

---

## 6. Automated Verification Suites

Run all test suites locally to verify 100% launch readiness:

```bash
# Typecheck & Linter (0 errors)
npm run lint

# Production Vite Bundle
npm run build

# RBAC, Concurrency & Security Gate Tests (10/10 checks)
npm run test:rbac

# Multi-Node Fleet & Transparency Tests (7/7 checks)
npm run test:fleet

# End-to-End User Authentication Suite (45/45 assertions)
npm run test:e2e

# Run all test suites
npm test
```

---

## 7. License
Apache-2.0. Clean software supply chain.
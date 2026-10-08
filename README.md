# Personal Cybersecurity Bot & Multi-Node Fleet Manager

Defensive, privacy-first desktop cybersecurity console and unified multi-node fleet management platform on Windows.

---

## 1. Unified Single Web Architecture

All features—threat monitoring, hardware telemetry, deep security posture, and multi-node fleet management—are consolidated into **one single web application on Port 3000** (no split servers or secondary dependencies).

| Component | Technology Stack | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Unified Security & Fleet Console** | React 19, TypeScript, Vite, Tailwind CSS v4, Express, TanStack Query | `127.0.0.1:3000` | Single-pane administrative dashboard: real-time threat defense, multi-node remote laptop fleet management, live kernel hardware telemetry, active application tracking, transparent user notices, cryptographic audit ledger. |

---

## 2. Multi-Node Fleet & Remote Laptop Management

- **Single Admin, Multi-Laptop Visibility**: One administrator can monitor and manage multiple enrolled laptops/PCs simultaneously across local subnets, VPNs, or remote network nodes.
- **Persistent User Transparency**: Monitored endpoints display a clear, persistent transparency badge confirming that security telemetry (CPU, RAM, active application name, threat scans) is being shared with the administrator.
- **Continuous Defense (No Arbitrary Time Limits)**: Protection and health monitoring operate continuously without expiring countdowns.
- **Strict Privacy Guarantees**:
  - **ZERO Keystroke Logging**
  - **ZERO Screen Recording or Webcam Access**
  - **ZERO Personal Credential or Email Inspection**
  - **Encrypted Local Audit Trail**
- **Live Hardware & Network Telemetry**:
  - Real CPU load and physical RAM metrics (WMI/PowerShell/os.cpus/totalmem)
  - Real active foreground application detection (`chrome.exe`, `Code.exe`, etc.)
  - Real ARP subnet discovery of connected laptops and network devices
  - On-demand remote TCP security probing & OS fingerprinting

---

## 3. Hardened Security & Zero-Trust Guarantees

- **PBKDF2 SHA-256 Vault**: Master PINs and emergency recovery keys use 100,000 PBKDF2 iterations with distinct 16-byte random salts. Zero plaintext secrets stored on disk or logs.
- **Timing-Safe Authentication**: Authenticated comparisons utilize `crypto.timingSafeEqual` with a 5-failure / 30-second brute-force lockout.
- **Server-Enforced Lockdown**: All mutating state requests (`POST`, `PUT`, `DELETE`) are blocked server-side with `CONSOLE_LOCKED` whenever the console is locked. Automatic 15-minute inactivity lock.
- **Strict Loopback Boundary**: The Express service binds to `127.0.0.1`—inaccessible from unauthorized external networks.
- **SSRF & Decimal/Octal IP Normalization**: Multi-layer boundary firewall blocking loopback, cloud metadata (169.254.169.254), RFC 1918 subnets, and canonicalizing integer/octal IP evasion vectors.
- **Data Redaction & Prompt Injection Guard**: Automatic redaction of credentials, API keys, emails, and filesystem paths before AI processing; regex injection filtering and delimited context tags.
- **Cryptographic Audit Ledger**: Tamper-evident monotonic sequence envelopes with HMAC-SHA256 snapshot signing and verified restore.

---

## 4. Quick Start & One-Click Launch

### Prerequisites
- **Node.js** (v20+ LTS recommended)

### One-Click Launch (Windows)
Double-click `launch.bat` or run in PowerShell:
```powershell
.\launch.ps1
```
This automatically starts the Unified Web Security & Fleet Platform on `http://127.0.0.1:3000` and opens your default browser.

### Manual Launch
```bash
npm install --legacy-peer-deps
npm run dev
```

---

## 5. Automated Verification Suites

Run all test suites locally to verify 100% launch readiness:

```bash
# 1. Typecheck & Linter (0 errors)
npm run lint

# 2. Production Vite Bundle (built in <1s)
npm run build

# 3. Security Fixes & SSRF Encoding Check (10/10 assertions)
npm run test:security

# 4. Hardware Safety & Telemetry Test (6/6 checks)
npm run test:safety

# 5. Remote Node & IP Prober Test (5/5 checks)
npm run test:remote

# 6. Multi-Node Fleet & Transparency Test (5/5 checks)
npm run test:fleet

# 7. Run All Core Suites Together
npm run test:all

# 8. Full Production Release Verification Suite (14/14 checks)
npx tsx tests/release_verification.ts
```

---

## 6. License
Apache-2.0. Clean software supply chain (zero copyleft/GPL constraints).
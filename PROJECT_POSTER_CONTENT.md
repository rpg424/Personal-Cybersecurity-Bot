# MAEER'S Maharashtra Institute of Technology, Thane, Mumbai
## Research Project Competition • Date: 10/10/2026

---

### Project Title
**SHIELD LABS: UNIFIED DEFENSIVE MULTI-NODE FLEET COCKPIT & ZERO-TRUST CYBERSECURITY PLATFORM**

### Team Details
**Team Members:** Rohan Prajapat | Vedant Surve | Tanvi Patil | Srushti More  
**Project Guide:** Prof. [Guide Name]

---

## 1. INTRODUCTION & OBJECTIVE
- **Background:** Modern endpoint cybersecurity is challenged by fragmented tools, vulnerable LAN exposure, unverified agent loops, and invasive surveillance methods that compromise user privacy.
- **Objective:** To develop an integrated, single-port defensive cybersecurity platform that combines real-time endpoint telemetry, agentless remote node auditing, and transparent multi-node fleet management.
- **Key Objective:** Design, implement, and validate a hardened Zero-Trust architecture featuring PBKDF2 SHA-256 vault encryption, timing-safe authentication, and strict role immutability.

---

## 2. PROBLEM STATEMENT
- **Existing Systems:** Current network management systems rely on split architectures, unencrypted IPC tokens, and trust client-controlled headers (`X-Forwarded-For`), leading to LAN spoofing and session takeovers.
- **Challenge:** Enabling real-time multi-laptop telemetry and remote remediation without intrusive surveillance (zero keystroke logging, zero screen recording) while strictly isolating device telemetry between security analysts.
- **Motivation:** Create a robust, tamper-resistant, defensive platform applicable to local endpoints, remote Wi-Fi fleet laptops, and centralized SOC administration.

---

## 3. REQUIREMENTS

### Hardware Requirements
- **Central SOC Host:** Intel Core i5 / AMD Ryzen, 8GB+ RAM, Gigabit Ethernet / 802.11 Wi-Fi.
- **Remote Fleet Endpoints:** Windows 10/11 laptops / client nodes on local or extended subnets.
- **Network Telemetry Probes:** TCP/3000 (Console), ICMP Prober, TCP Port Auditor (445, 3389, 22).
- **Storage & Power:** NVMe/SSD storage for persistent user and audit databases; standard AC / 5V-12V power supply.

### Software Requirements
- **Languages:** TypeScript, JavaScript (Node.js v20+), Python, PowerShell Core.
- **IDEs & Frameworks:** VS Code, React 19, Vite, Tailwind CSS v4, Express, TanStack Query.
- **Security & Cryptography:** PBKDF2 SHA-256 (100k rounds), Timing-Safe Auth, Dual-Mode Email OTP.
- **Data Store:** Persistent JSON File Store (PBKDF2-salted user roster, cryptographic audit ledger).
- **Verification Engine:** 6 automated test suites (100% test coverage across RBAC, Safety, Fleet, E2E).

---

## 4. BLOCK DIAGRAM / SYSTEM ARCHITECTURE

```
+-------------------------------------------------------------------------------+
|                        HARDWARE & ENDPOINT LAYER                              |
|   [Host Endpoint: Laptop 1]                 [Remote Fleet Laptops: Node 2, 3] |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------+   +---------------------------------------+
|       DATA ACQUISITION            |   |           SECURITY BOUNDARY           |
| • One-Click PowerShell Agent      |-->| • Socket Address Normalizer           |
| • Browser Telemetry Join (#join)  |   | • SSRF & Decimal/Octal IP Filter      |
| • CPU %, RAM, File Scanners       |   | • Zero-Trust Header Sanitizer         |
+-----------------------------------+   +---------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                    CENTRAL PLATFORM ENGINE (PORT 3000)                        |
|   • Express HTTP & WebSocket Server     • PBKDF2 SHA-256 Vault                |
|   • Dual-Mode Email OTP Engine          • Role-Based Access Control (RBAC)    |
+-------------------------------------------------------------------------------+
                  |                                           |
                  v                                           v
+-----------------------------------+   +---------------------------------------+
|        REMEDIATION CONTROL        |   |          UNIFIED SOC CONSOLE          |
| • Remote File Quarantine          |   | • Single-Pane React 19 Dashboard      |
| • Malicious Process Kill          |   | • Live Telemetry & Transparency Badge |
| • Network Domain Blocking         |   | • Master Admin User Directory         |
+-----------------------------------+   +---------------------------------------+
```
*Caption: Integrated hardware-software flow for real-time data processing, privacy-first telemetry, and autonomous control.*

---

## 5. CIRCUIT DIAGRAM / FLOW DIAGRAM

### Software Execution Flow
```
[Start]
   │
   ▼
[Initialize System & PBKDF2 Vault]
   │
   ▼
[Read Sensor & Node Telemetry (CPU, RAM, Suspicious Binaries)]
   │
   ▼
[Process & Analyze Data / Audit Threat Vectors]
   │
   ▼
[Trigger Control Output / Remote Remediation / Quarantine]
   │
   ▼
[Log Data & Immutable Audit Ledger]
   │
   ▼
[Send to SOC Console / Display via Port 3000]
   │
   ▼
[Loop: 5-Second Continuous Monitoring Interval] ───► (Repeat Telemetry Read)
```
*Caption: End-to-end continuous sensing, verification, remediation, and display loop.*

---

## 6. WORKING PRINCIPLE / METHODOLOGY
- **Step 1 (Data Acquisition):** Enrolled endpoints stream hardware vitals (CPU %, RAM, suspicious downloads) via authenticated 5-second heartbeats or agentless TCP probes.
- **Step 2 (Zero-Trust Validation):** Central server normalizes client socket IPs, strictly rejecting spoofed headers (`X-Forwarded-For`), octal IP encodings, and cloud metadata access.
- **Step 3 (Authentication & RBAC):** Public registration assigns the `SECURITY_ANALYST` role with 6-digit OTP verification; Master Admin credentials required for privilege escalation.
- **Step 4 (Remediation & Privacy):** Master Admin executes remote file quarantines and process termination; secondary analysts see only their own local device telemetry.
- **Methodology:** Requirement Analysis ➔ Modular Architecture ➔ Threat Boundary Hardening ➔ Automated E2E Regression Testing (100% Passed).

---

## 7. RESULT & PROTOTYPE IMAGES

### Prototypes Displayed
- **Fig. 1:** Hardware Prototype / Multi-Node Fleet Cockpit showing connected endpoints and hardware health.
- **Fig. 2:** Software Dashboard / SOC User Management Console with live presence tracking and role delegation.

### Model & System Performance Evaluation
| Metric | Value | Remarks |
| :--- | :---: | :--- |
| **Auth Response Latency** | **< 15 ms** | PBKDF2 timing-safe verification |
| **Telemetry Sync Interval** | **5.0 s** | Real-time multi-node heartbeat sync |
| **Concurrent User Sessions** | **15+ Nodes** | 0 collisions, isolated session state |
| **Boundary SSRF Accuracy** | **100%** | Octal/Decimal IP evasion filtered |
| **Automated Test Pass Rate** | **100% (78/78)** | All 6 verification test suites passed |
| **Memory Footprint** | **~85 MB** | Lightweight unified Node.js runtime |

---

## 8. CONCLUSION & FUTURE SCOPE
- **Conclusion:** The system successfully demonstrates a robust, defensive cybersecurity console and multi-node fleet cockpit on a unified single port (`3000`), achieving reliable data acquisition, zero-trust hardware isolation, and timing-safe authentication validated by 100% test suite completion.
- **Future Scope:**
  - Integrate Edge Machine Learning anomaly detection models for automated zero-day threat heuristics.
  - Implement hardware-backed TPM 2.0 enclave attestation for cryptographically verified node identity.
  - Expand agent support across Linux and macOS remote endpoints with enterprise SIEM integration.

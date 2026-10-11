# PowerPoint (PPT) Presentation Deck & Script
## MAEER'S Maharashtra Institute of Technology, Thane, Mumbai
### Research Project Competition • October 10, 2026

**Project Title:** SHIELD LABS: UNIFIED DEFENSIVE MULTI-NODE FLEET COCKPIT & ZERO-TRUST CYBERSECURITY PLATFORM  
**Team Members:** Rohan Prajapat | Vedant Surve | Tanvi Patil | Srushti More  
**Project Guide:** Prof. [Project Guide Name]  

---

## Slide 1: Title Slide
* **Layout:** Cover / Title Slide (Dark Navy Background `#002B49` with White & Cyan Text)
* **Header / Logo:** MAEER'S Maharashtra Institute of Technology, Thane, Mumbai
* **Main Title:** 
  # SHIELD LABS
  ### Unified Defensive Multi-Node Fleet Cockpit & Zero-Trust Cybersecurity Platform
* **Subtitle:** Research Project Competition • October 10, 2026
* **Team Members:**
  - Rohan Prajapat
  - Vedant Surve
  - Tanvi Patil
  - Srushti More
* **Project Guide:** Prof. [Guide Name]
* **Speaker Notes:**
  > "Respected judges, faculty members, and fellow researchers, good morning. Today, our team—Rohan Prajapat, Vedant Surve, Tanvi Patil, and Srushti More—is proud to present our project: 'Shield Labs: Unified Defensive Multi-Node Fleet Cockpit and Zero-Trust Cybersecurity Platform', developed under the guidance of Prof. [Guide Name]."

---

## Slide 2: Introduction & Motivation
* **Layout:** Two Columns (Left: Context & Need | Right: Our Core Vision)
* **Slide Title:** Introduction & Motivation
* **Bullet Points:**
  - **The Threat Landscape:** Rising prevalence of endpoint-targeted intrusions, ransomware propagation across local subnets, and unmonitored laptops on campus/enterprise Wi-Fi networks.
  - **Limitations of Current Tools:** Modern cybersecurity solutions are heavily fragmented across disjointed ports, consume high system resources, and often rely on unverified third-party cloud brokers.
  - **The Privacy Dilemma:** Existing corporate endpoint monitors deploy intrusive surveillance (keyloggers, screen recording) which violate user privacy and ethical boundaries.
  - **Our Vision:** A consolidated, privacy-first defensive console running on a single web service that delivers real-time fleet health, zero-trust device isolation, and autonomous threat remediation.
* **Speaker Notes:**
  > "In modern network environments, securing endpoint devices like laptops is critical. However, existing tools suffer from a major tradeoff: they either expose security vulnerabilities due to fragmented architectures, or they act as invasive spyware that records screens and keystrokes. Our objective was to create a defensive, transparent platform that protects endpoints without compromising user privacy."

---

## Slide 3: Problem Statement
* **Layout:** 3 Challenge Cards / Pillars
* **Slide Title:** Problem Statement & Existing System Deficiencies
* **Bullet Points:**
  1. **LAN Identity Spoofing & Session Forgery:**
     - Traditional architectures blindly trust client-supplied headers like `X-Forwarded-For`.
     - LAN callers can easily spoof loopback IP (`127.0.0.1`) and hijack administrator privileges.
  2. **Unauthenticated Agent Traffic & Public Tokens:**
     - Many fleet tools broadcast IPC bearer tokens in plaintext over unauthenticated endpoints.
     - Remote agents polling for commands are vulnerable to man-in-the-middle takeovers.
  3. **Lack of Zero-Trust Device Privacy:**
     - In standard SOC environments, secondary security analysts often gain unauthorized visibility into confidential host machine hardware metrics and files.
* **Speaker Notes:**
  > "When examining contemporary endpoint managers, we discovered severe vulnerabilities: servers trusting client HTTP headers, plaintext bearer tokens, and a total lack of device privacy between analysts. Our problem statement was clear: How can we build an endpoint management platform that is resilient against header spoofing, preserves device privacy, and operates on zero-trust principles?"

---

## Slide 4: Proposed Solution & Objectives
* **Layout:** Highlights Grid (4 Key Pillars)
* **Slide Title:** Proposed Solution & Key Objectives
* **Bullet Points:**
  - **Unified Single-Port Architecture:** All operations—fleet telemetry, hardware diagnostics, user directory, and remediation—are served over one unified port (`0.0.0.0:3000`).
  - **Zero-Trust Device Privacy:** Enrolled laptops see exclusively their own diagnostic metrics. Host machine vitals are strictly confidential to the Master Admin.
  - **Privacy-First Transparency:** Persistent user transparency badges on all monitored nodes with **ZERO** keystroke logging, **ZERO** screen recording, and **ZERO** personal data inspection.
  - **Hardened Cryptographic Security:** Dual-mode email OTP engine, PBKDF2 SHA-256 vault (100k iterations), timing-safe comparisons, and absolute role immutability.
* **Speaker Notes:**
  > "To solve these challenges, we designed Shield Labs. First, we unified all services onto a single web application. Second, we enforced zero-trust device privacy so analysts cannot snoop on other laptops. Third, we established a strict transparency policy with zero covert surveillance. And fourth, we backed the entire system with robust PBKDF2 cryptography and email OTP verification."

---

## Slide 5: System Architecture & Block Diagram
* **Layout:** Diagram Centric with Flow Descriptions
* **Slide Title:** System Architecture & Block Diagram
* **Visual Elements:** (Embed Architecture Flow Diagram)
  - **Layer 1: Hardware & Endpoint Layer:** Host PC (Laptop 1) and Remote Fleet Nodes (Laptops 2, 3).
  - **Layer 2: Data Acquisition Module:** One-click PowerShell agent (`irm ... | iex`) + Browser join (`#join`).
  - **Layer 3: Security Boundary & Normalizer:** Socket-level IP resolution, SSRF octal/decimal filter, and zero-trust session initialization.
  - **Layer 4: Central Core Engine (Port 3000):** Express Server, PBKDF2 Vault, Dual-Mode Email OTP Engine, and RBAC Controller.
  - **Layer 5: Presentation & Remediation:** Single-pane React 19 dashboard, real-time presence tracking, and remote quarantine / process kill queue.
* **Speaker Notes:**
  > "Here is our 5-layer architectural diagram. Endpoints stream CPU, RAM, and suspicious file indicators through our lightweight agent. Telemetry passes through our boundary firewall—which sanitizes IPs and rejects spoofed headers—into our Express core engine. The Master Admin then monitors all nodes from a central dashboard while secondary users remain strictly confined to their own device view."

---

## Slide 6: Hardware & Software Requirements
* **Layout:** Two Comparison Columns
* **Slide Title:** System Requirements & Technology Stack
* **Content:**
  ### Hardware Specifications
  - **Central SOC Host Machine:** Intel Core i5 / AMD Ryzen, 8GB+ RAM, Gigabit Ethernet / 802.11 Wi-Fi.
  - **Remote Fleet Laptops:** Windows 10/11 endpoints on local Wi-Fi or extended subnet.
  - **Network Probes:** Port 3000 (Console), ICMP Prober, TCP Port Auditor (445 SMB, 3389 RDP, 22 SSH).
  - **Storage:** Solid State Drive (NVMe/SSD) for persistent PBKDF2 user repository.

  ### Software Stack
  - **Frontend:** React 19, Vite, Tailwind CSS v4, TanStack Query, Lucide Icons.
  - **Backend & Core:** Node.js (v20+ LTS), Express, TypeScript / Tsx, WebSocket.
  - **Cryptography:** Node.js native `crypto` (PBKDF2 SHA-256 100k rounds, `crypto.timingSafeEqual`).
  - **Automation & Agent:** Windows PowerShell Core, Tsx runtime engine, 6 automated verification suites.
* **Speaker Notes:**
  > "For our technology stack, we selected modern, production-grade tools. On the frontend, we utilize React 19 and Vite for high performance. On the backend, we run Node.js with TypeScript. Critically, we avoid external cryptography dependencies by using Node's native PBKDF2 and timingSafeEqual primitives to prevent timing side-channel attacks."

---

## Slide 7: Working Principle & Execution Flow
* **Layout:** Step-by-Step Horizontal Process Flow (4 Stages)
* **Slide Title:** Working Principle & Execution Flow
* **Bullet Points:**
  1. **Phase 1: Multi-Node Telemetry Ingestion**
     - Endpoints enroll via one-click PowerShell script or browser `#join`.
     - 5-second heartbeats transmit real hardware vitals (CPU %, RAM, disk health, suspicious binaries in Temp/Downloads).
  2. **Phase 2: Raw Socket Inspection & SSRF Boundary**
     - The server reads `req.socket.remoteAddress`, stripping `X-Forwarded-For`.
     - SSRF engine canonicalizes octal/decimal IP evasion attempts and blocks loopback/metadata.
  3. **Phase 3: Dual-Mode OTP & Role Enforcement**
     - Public registrations default to `SECURITY_ANALYST` role with 6-digit email OTP verification.
     - Role immutability ensures non-admins cannot self-elevate (HTTP 403).
  4. **Phase 4: Remote Remediation & SOC Display**
     - Master Admin dispatches remote file quarantines and process termination.
     - Central console reflects live status (`🟢 Active / Online Now`) with an immutable audit ledger.
* **Speaker Notes:**
  > "The operational workflow proceeds in four distinct phases: First, endpoints transmit vitals every 5 seconds. Second, the server validates the raw socket connection, neutralizing any header spoofing. Third, authentication strictly enforces analyst roles with 6-digit OTP verification. Finally, the Master Admin can initiate remote process kills or file quarantines when malicious activity is spotted."

---

## Slide 8: Zero-Trust Security & Anti-Takeover Guarantees
* **Layout:** 4 Security Badges / Verification Cards
* **Slide Title:** Security Architecture & Anti-Takeover Guarantees
* **Bullet Points:**
  - **Anti-Takeover OTP Protocol:**
    - OTP verification only confirms email ownership (`isVerified = true`).
    - It **never** issues an authenticated session or elevates roles without explicit password authentication.
  - **Header Spoofing Immunity:**
    - Client-supplied `X-Forwarded-For` and `X-Real-IP` headers are discarded.
    - All new sessions initialize strictly as `isLocked: true` and `role: 'NO_ROLE'`.
  - **Enrollment Token Isolation:**
    - Global IPC tokens are never returned to unauthenticated callers on `/api/v1/enrollment`.
  - **Zero-Covert Surveillance Policy:**
    - Explicitly blocks webcam access, keystroke logging, and screen capture.
    - Persistent banner informs users their hardware vitals are actively monitored.
* **Speaker Notes:**
  > "A primary highlight of our work is our defense-in-depth security model. In previous revisions, OTP verification could inadvertently elevate sessions. We resolved this by strictly decoupling email verification from session issuance. Furthermore, by ignoring spoofed headers and enforcing locked sessions by default, we eliminate LAN identity spoofing."

---

## Slide 9: Implementation Results & Dashboard Features
* **Layout:** 2 Feature Screenshots / Visual Cards with Key Highlights
* **Slide Title:** Implementation & Experimental Results
* **Key Features Demonstrated:**
  1. **Unified Multi-Node Fleet Cockpit:**
     - Real-time display of all connected endpoints with CPU %, RAM load, and connection status.
     - Device deduplication: Browser reloads maintain persistent node identity without duplicate cards.
     - Transparency Badge: Informs endpoint users of active monitoring.
  2. **Master Admin User Directory:**
     - Real-time online presence detection (`🟢 Active / Online Now` vs `⚪ Offline`).
     - Sole authority to delegate administrative privileges (`ADMIN`, `AUDITOR`, `SECURITY_ANALYST`).
  3. **Agentless Network Port Prober:**
     - Rapid TCP socket audit detecting exposed high-risk ports (SMB 445, RDP 3389).
* **Speaker Notes:**
  > "Here are our live implementation results. On the left is our Fleet Cockpit, displaying real-time telemetry from multiple laptops. Browser reloads preserve node identity without duplicate entries. On the right is the Master Admin User Directory, providing live presence tracking and role delegation capabilities."

---

## Slide 10: Performance Evaluation & Testing Metrics
* **Layout:** Structured Data Table + Test Badges
* **Slide Title:** Performance Evaluation & Test Verification
* **Data Table:**
| Performance Metric | Measured Value | Benchmark / Significance |
| :--- | :---: | :--- |
| **Authentication Response Time** | **< 15 ms** | PBKDF2 SHA-256 + Timing-Safe Equality |
| **Fleet Telemetry Synchronization** | **5.0 s** | Real-time multi-node heartbeat interval |
| **Concurrent Session Handling** | **15+ Nodes** | 0 state collisions, isolated session store |
| **SSRF Boundary Firewall Accuracy**| **100%** | Loopback, Octal, Decimal IP evasion filtered |
| **Automated Test Pass Rate** | **100% (78/78)** | 6 automated test suites passed |
| **Memory Footprint** | **~85 MB** | Lightweight unified single-service footprint |

* **Automated Suites Verified:**
  - `test:security` (10/10) • `test:safety` (100%) • `test:remote` (100%)
  - `test:fleet` (7/7) • `test:rbac` (10/10) • `test:e2e` (45/45)
* **Speaker Notes:**
  > "To ensure rigorous quality, we benchmarked the system across key operational metrics. Authentication resolves in under 15 milliseconds using 100,000 PBKDF2 iterations. Telemetry syncs every 5 seconds. Most importantly, our entire test harness—comprising 6 dedicated suites and 78 automated assertions—achieved a 100% pass rate."

---

## Slide 11: Conclusion & Future Scope
* **Layout:** Two Summary Boxes (Conclusion vs Future Roadmap)
* **Slide Title:** Conclusion & Future Scope
* **Content:**
  ### Conclusion
  - Successfully built a unified, defensive cybersecurity platform and multi-node fleet cockpit on a single port (`3000`).
  - Achieved rigorous zero-trust device privacy, header spoofing immunity, and role immutability.
  - Eliminated invasive surveillance while maintaining complete real-time endpoint visibility.
  - 100% test verification across all security, safety, and operational workflows.

  ### Future Scope
  - **AI / ML Integration:** Deploy edge Machine Learning models for predictive anomaly detection and zero-day threat heuristics.
  - **Hardware TPM Attestation:** Incorporate TPM 2.0 enclave verification for hardware-cryptographic machine authentication.
  - **Cross-Platform Agents:** Extend native PowerShell agents to Linux (Bash/eBPF) and macOS endpoints.
  - **Enterprise SIEM Forwarding:** Export cryptographic audit ledgers directly into Wazuh, Splunk, and Elastic SIEM.
* **Speaker Notes:**
  > "In conclusion, Shield Labs proves that defensive endpoint management can be fast, secure, and privacy-respecting on a single unified web architecture. Looking ahead, we plan to integrate edge machine learning for proactive anomaly detection, leverage TPM 2.0 hardware enclaves for machine identity, and expand to Linux and macOS environments."

---

## Slide 12: Q&A & Thank You
* **Layout:** Centered Closing Slide
* **Slide Title:** Thank You!
* **Project:** Shield Labs Bot: Unified Defensive Multi-Node Fleet Cockpit
* **Team Members:** Rohan Prajapat | Vedant Surve | Tanvi Patil | Srushti More
* **Institute:** MAEER'S Maharashtra Institute of Technology, Thane, Mumbai
* **Interactive Live Demo:** Available on `http://127.0.0.1:3000`
* **Speaker Notes:**
  > "Thank you for your time and attention. We are now open for any questions or a live demonstration of the platform."

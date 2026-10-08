# Architecture Decision Record (ADR-001)
# Selection of Desktop Shell: Tauri vs. Electron

- **Status**: ACCEPTED
- **Date**: 2026-09-28
- **Product**: Personal Cybersecurity Bot
- **Decision Owner**: Lead Engineer and Product-Security Architect

---

## 1. Context and Problem Statement
Personal Cybersecurity Bot is a defensive, privacy-first desktop security console designed for non-technical users, families, and solo professionals on Windows. The architecture requires a lightweight, highly secure desktop shell hosting an untrusted React/TypeScript renderer, communicating exclusively with a local Java/Spring Boot protection service over authenticated localhost IPC.

We must decide definitively between **Tauri (v2)** and **Electron (v30+)**. Dual-implementation is strictly prohibited.

---

## 2. Evaluation Across the 10 Mandatory Criteria

| Criteria | Tauri v2 (Rust + WebView2) | Electron (Chromium + Node.js) | Comparative Assessment |
|---|---|---|---|
| **1. Memory Footprint** | ~35–60 MB idle RAM (reuses system Evergreen WebView2 runtime). | ~180–350 MB idle RAM (bundles full Chromium instance). | **Tauri wins decisively**. Crucial for elderly/family PCs with 8GB RAM where background security software must remain lightweight. |
| **2. Java Process Lifecycle** | Tauri Core (Rust) acts as parent supervisor; can spawn Java runtime (`javaw.exe`) as child process with `JobObject` containment on Windows. | Electron main process (Node `child_process`) can spawn Java, but Node garbage collection and heap bloat add overhead. | **Tauri wins**. Rust `JobObject` APIs provide deterministic kernel-level cleanup when the shell exits or crashes. |
| **3. IPC Security** | Strong isolation. Webview uses explicit message passing (`invoke`), no `nodeIntegration`, strict IPC command allowlists in `tauri.conf.json`. | Requires manual hardening (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, custom preload). Frequent CVEs in preloads. | **Tauri wins**. Safer default attack surface; zero Node.js primitives exposed to the DOM. |
| **4. Native Windows Integration** | Direct Win32 FFI via `windows-rs` crate (named pipes, DPAPI, ETW listeners, Defender coexistence status queries). | Requires C++ Node addons (node-gyp) or external CLI scripts, which increase build complexity and supply-chain vulnerabilities. | **Tauri wins**. Native Rust Win32 bindings are safer, type-checked, and compile directly to native binaries. |
| **5. Packaging & Distribution** | Small MSI/NSIS installer (~12–18 MB shell installer + Java JRE bundle via `jlink`). Total package ~55 MB. | Large installer (~90–140 MB before JRE). Total package exceeds 180 MB. | **Tauri wins**. Much faster download and installation for users on metered or slower residential broadband. |
| **6. Updater Safety** | Built-in cryptographic updater using Minisign ed25519 signatures. Fails closed on signature mismatch. | Electron-updater (Squirrel/NSIS) has historically suffered from path-traversal and elevation-of-privilege CVEs. | **Tauri wins**. ed25519 cryptographically verified in-process before executing elevated patchers. |
| **7. Accessibility** | Uses Windows native UI Automation (UIA) via Edge/WebView2. Full compatibility with JAWS, NVDA, and Windows Narrator. | Uses Chromium accessibility tree. Highly mature accessibility, comparable to WebView2. | **Tie**. Both provide standard WCAG AA / ARIA compliance via Chromium-based rendering engines. |
| **8. Startup Latency** | Cold start <400 ms. Fast binary execution with minimal runtime bootstrap. | Cold start 1.5–3.2 s due to Chromium engine initialization. | **Tauri wins**. Feels instantaneous when launched from the system tray or on Windows login. |
| **9. Attack Surface** | Minimal: Rust memory safety, no Node.js runtime inside the frontend renderer, locked-down WebView2 flags. | High: Node.js runtime, V8 exploits, extensive npm dependency tree in main process. | **Tauri wins**. Significantly reduces remote code execution (RCE) vectors. |
| **10. Maintenance & Longevity** | Stable ABI, unified Rust/Cargo toolchain, clean separation of concerns. Requires Rust familiarity for native plugins. | Huge npm ecosystem, but frequent breaking changes across major Electron releases (every 8 weeks). | **Tauri wins for long-term security maintenance**. |

---

## 3. Decision
**We select Tauri v2 as the canonical desktop shell architecture for Personal Cybersecurity Bot.**

### Architecture Invariant
1. The shell is built with Tauri v2 (utilizing Windows WebView2).
2. The UI renderer runs inside WebView2 as an untrusted client.
3. The Java protection service runs as an isolated local background service (`127.0.0.1` only).
4. In this web development sandbox container, the Express server simulates the local authenticated protection service and provides the exact REST API + SSE transport that the Tauri frontend integrates with.

# Personal Cybersecurity Bot — Inspection Report & Foundations

## 1. Executive Inspection & Repository Inventory

- **Target Product Name**: `Personal Cybersecurity Bot` (Exact canonical name enforced across all documentation, UI, code, and metadata).
- **Execution Target**: Windows Desktop application (with local Java 21 / Spring Boot 3 / Native adapter security authority architecture and React TypeScript untrusted renderer). In this sandbox container, running full-stack verified mockable adapters with explicit `MOCKED` and `SAFE SIMULATION` declarations where Windows kernel/ETW/Win32 APIs are not present.
- **Repository Baseline**:
  - Runtime: Node.js 22 LTS, React 19, TypeScript 5+, Tailwind CSS v4, Vite 8, Express 4.
  - SDKs: `@google/genai` (v2.4.0) initialized server-side only for Gemini assistant capabilities.
  - UI State Management: TanStack React Query for server state (`/api/v1/*`), React Context for local UI/accessibility state.

### Traceability Inventory

| Requirement ID | Requirement Description | Existing Support | Missing Support | Risk Level | Dependency | License Concern | Verification Method | Planned Phase |
|---|---|---|---|---|---|---|---|---|
| REQ-01 | Architecture Authority: Untrusted Renderer & Authenticated Localhost IPC | None (blank template) | Full IPC contract & token auth | High | Express / HTTP / SSE on 127.0.0.1 | None (MIT/Apache) | Automated IPC integration tests & token validation | Phase A / B1 |
| REQ-02 | Electron vs Tauri Architecture Decision Record | None | Complete 10-criteria ADR | Low | Documentation / Analysis | None | Architectural peer review | Phase A |
| REQ-03 | Consent-Based Onboarding & Local Device Enrollment | None | Interactive enrollment flow with token generation | Medium | Local storage / SQLite | None | End-to-end browser walkthrough | Phase B2 |
| REQ-04 | Protection Status Model (green/yellow/red/unknown) | None | Strict state calculation engine & explanation | Medium | Capability status engine | None | Automated precedence tests | Phase B3 |
| REQ-05 | Telemetry Adapters (Process, Network, Download, File, USB) | None | Mockable Windows adapters with explicit status tags | High | Windows ETW/Win32 mock harness | None | Synthetic telemetry playback test | Phase B4 |
| REQ-06 | Versioned Detector Registry & Inert Synthetic Fixtures | None | Registry engine + LOLBin, ransomware canary, phishing rules | Medium | Inert synthetic fixtures | MIT/Apache rules | Evaluation harness test | Phase B5 |
| REQ-07 | Explainable Alert Detail, Timeline & Audit History | None | Alert center, causal timeline, technical evidence | Low | React + TanStack Query | None | Browser UI verification | Phase B6 |
| REQ-08 | Sensitive Action Lifecycle (Preview, Confirm, Authorize, Execute, Idempotent) | None | Full state machine with rollback/cancellation | Critical | Server-side auth engine | None | Adversarial replay & duplicate POST test | Phase B7 |
| REQ-09 | Offline Persistence, Encrypted Queue, Key Hierarchy & Export/Delete | None | SQLite schema, AES-256-GCM / DPAPI model, export/delete endpoints | High | Local persistence | None | Retention and deletion verification | Phase B8 |
| REQ-10 | Panic Flow with Honest Scope and Recovery Guidance | None | Real server-side isolation simulation & recovery | High | Network adapter mock | None | Panic execution and restore test | Phase B9 |
| REQ-11 | Desktop-first Accessible Console (WCAG AA, 100-200% scaling, reduced motion) | None | Full accessible layout, keyboard nav, live regions | Medium | Tailwind CSS + Lucide React | None | Accessibility checklist audit | Phase B & C |
| REQ-12 | Performance Budgets & Release Artifacts (SBOM, Windows deploy guide) | None | Resource monitoring harness, SBOM, signing hooks | Medium | Packaging documentation | None | Simulated benchmark verification | Phase B10 |

---

## 2. Assumptions & Trust Boundary Decisions

1. **Local Security Authority**: The UI renderer is completely untrusted. All capabilities, actions, status calculations, and alert rules execute in the backend service. The UI cannot initiate or assume success of an action without server confirmation.
2. **Windows Sandbox Realism**: Because this environment runs on a Linux container, all native Windows APIs (Windows Filtering Platform, ETW, Mini-filter drivers, AMSI, DPAPI) are modeled through clean interface boundaries labeled `MOCKED` or `SAFE SIMULATION`. No claim of live Windows kernel enforcement is made without a physical Windows host.
3. **Privacy by Default**: No user data, file contents, or telemetry leaves `127.0.0.1`. Optional cloud intelligence (Gemini assistant) is explicitly opt-in, client-consented, and only sends user-approved alert summaries or queries via server-side proxy without file contents or credentials.
4. **Idempotency & Replay Resistance**: Every sensitive action requires a cryptographically random `idempotency_key`, an unguessable `operation_id`, and a strict expiry window (`expires_at_utc`). Repeated submissions return the cached operation result rather than re-executing.

# Personal Cybersecurity Bot — UI State Catalog & Traceability Matrix

## 1. Design Tokens & Visual Architecture

- **Visual Baseline**: Desktop-first layout, calm graphite and dark slate palette (`#0F172A`, `#1E293B`, `#334155`), zero neon cyberpunk clichés, zero skull icons, zero fake hacker clutter.
- **Semantic Pairing**:
  - Green (`#16A34A` / emerald): Paired with CheckCircle icon + unambiguous label `"Active / Protected"`.
  - Amber (`#D97706` / amber): Paired with AlertTriangle icon + unambiguous label `"Attention / Degraded"`.
  - Crimson (`#DC2626` / red): Paired with ShieldAlert icon + unambiguous label `"Action Required / Critical"`.
  - Slate (`#64748B` / gray): Paired with HelpCircle icon + unambiguous label `"Unknown / Verifying"`.
- **Accessibility & Scaling**:
  - WCAG AA compliant contrast ratios ($\ge 4.5:1$ for body, $\ge 3:1$ for large text).
  - Explicit high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-emerald-400`).
  - Supports 100% to 200% text zoom and responsive narrow desktop windows down to 900px.
  - Full keyboard navigation (Tab, Shift+Tab, Arrow keys, Esc to dismiss modals, Enter/Space to activate).
  - Screen reader live regions (`aria-live="polite"` for non-disruptive updates, `aria-live="assertive"` for emergency status changes).
  - Respects `prefers-reduced-motion` with instant transitions.

---

## 2. Screen Traceability & State Matrix

| Screen Name | Requirement ID | Core Purpose | Supported States |
|---|---|---|---|
| **1. Onboarding & Enrollment** | REQ-03 | Informs user of boundaries, privacy, Defender coexistence; captures explicit local consent and sets up token. | Initial, Consented, Token Generated, Error, Safe-Mode fallback. |
| **2. Home Protection Status** | REQ-04, REQ-05 | Primary status cockpit: green/yellow/red/unknown with plain language explanation, 7 coverage shields, and health. | Loading, Success, Degraded (yellow), Stopped (red), Unknown, Stale telemetry. |
| **3. Alert Center** | REQ-06, REQ-07 | Triage list with filters by severity, state, time, detector type, and confidence score. | Empty (no threats), Filtered, Populated, Offline cached, Network error. |
| **4. Alert Detail** | REQ-07 | Plain-language "What Happened", "Why Risky", "What Bot Did", technical evidence accordion, confidence rationale. | Loading, Found, Not Found, Already Resolved, Action Pending. |
| **5. Guided Response Wizard** | REQ-08 | Safe multi-step confirmation: Preview impact $\rightarrow$ Authorization $\rightarrow$ Execution $\rightarrow$ Result & Recovery instructions. | Previewing, Awaiting Confirmation, Executing (progress bar), Succeeded, Failed, Timed Out, Cancelled. |
| **6. "What Just Happened?" Timeline** | REQ-06, REQ-07 | Chronological causality timeline showing parent-child process chains, network drops, and canary trips. | Loading, Populated, Telemetry Gap detected, Live streaming (SSE). |
| **7. History & Weekly Report** | REQ-09 | Searchable audit ledger, weekly safety summary, trends, gaps, and recommendations. | Generated, Empty history, Filtered, Exporting CSV/JSON. |
| **8. Recovery Center** | REQ-08, REQ-09 | Quarantined items vault, preview before restore, restore to original/custom path, permanent purge with double-confirmation. | Empty vault, Populated, Restoring, Purging, Error (file in use). |
| **9. Panic Flow** | REQ-10 | Controlled emergency network isolation with explicit preview of impact, active connections, and 1-click restore. | Armed, Previewing, Isolating, Isolated (Emergency banner), Restored, Unsupported/Mocked. |
| **10. Settings & Privacy** | REQ-09 | Local retention slider (7-90 days), data export, data wipe, optional cloud assistant toggle, suppressions manager. | Saved, Modifying, Exporting, Purging data, Offline. |
| **11. Service / Offline States** | REQ-01, REQ-04 | Reconnection overlay with exponential backoff, safe-mode banner, database recovery indicator. | Connected, Reconnecting (attempt count), Stale data warning, Localhost down. |
| **12. Security Assistant (Gemini)** | Attached Feature | Conversational triage assistant answering questions about threats in plain English with server-side AI proxy. | Idle, Thinking, Streaming response, Offline fallback (rule-based). |

